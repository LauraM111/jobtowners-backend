import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JobApplicationService } from './job-application.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { FilterJobApplicationDto } from './dto/filter-job-application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JobApplication } from './entities/job-application.entity';
import { ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { successResponse } from '../../utils/response-utils';
import { CandidatePaymentService } from '../candidate-payment/candidate-payment.service';
import { JobApplicationStatus } from './entities/job-application.entity';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JobService } from '../job/job.service';
import { UserType } from '../user/entities/user.entity';
import { Op } from 'sequelize';

@Controller('job-applications')
export class JobApplicationController {
  constructor(
    private readonly jobApplicationService: JobApplicationService,
    private readonly candidatePaymentService: CandidatePaymentService,
    private readonly jobService: JobService,
  ) {}

  @Get('employer-applicants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all applicants for employer jobs' })
  @ApiResponse({ status: 200, description: 'Applicants retrieved successfully' })
  async getEmployerApplicants(@Request() req) {
    try {
      // Check if user exists and has an ID
      const userId = req.user?.sub;
      
      if (!userId) {
        return successResponse({ applicants: [], total: 0 }, 'No applicants found');
      }
      
      const { applicants, total } = await this.jobApplicationService.getEmployerApplicants(userId);
      return successResponse({ applicants, total }, 'Applicants retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply for a job' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  async create(@Request() req, @Body() createJobApplicationDto: CreateJobApplicationDto) {
    try {
      // First check: Candidate daily application limit (payment-based)
      const { canApply: candidateCanApply, remainingApplications } = await this.candidatePaymentService.checkApplicationLimit(req.user.sub);
      
      if (!candidateCanApply) {
        // Get candidate payment stats for better error message
        const paymentStats = await this.candidatePaymentService.getUserPaymentStats(req.user.sub);
        
        if (!paymentStats.hasPaid) {
          throw new BadRequestException('You need to purchase a candidate application plan to apply for jobs. Please visit the pricing page to select a plan.');
        } else {
          throw new BadRequestException(`You have reached your daily application limit of ${paymentStats.dailyLimit} applications. Your limit will reset tomorrow.`);
        }
      }

      // Second check: Job-specific application limit (employer's subscription-based)
      // This is handled inside the jobApplicationService.create method
      
      // Create the application (this will check job-specific limits)
      const application = await this.jobApplicationService.create(req.user.sub, createJobApplicationDto);
      
      // Increment candidate's daily application count
      await this.candidatePaymentService.incrementApplicationCount(req.user.sub);
      
      return successResponse(
        { application, remainingApplications: remainingApplications - 1 },
        'Application submitted successfully'
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get job applications based on filter' })
  @ApiResponse({ status: 200, description: 'Job applications retrieved successfully' })
  @ApiQuery({ name: 'filter', enum: ['all', 'candidate', 'employer'], required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Request() req,
    @Query('filter') filter: string = 'all',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    try {
      // Parse page and limit to numbers
      const parsedPage = parseInt(page, 10) || 1;
      const parsedLimit = parseInt(limit, 10) || 10;
      
      // Check if user exists in the request
      const userId = req.user?.sub;
      const userType = req.user?.userType;
      
      if (!userId) {
        console.warn('User ID is undefined in job applications findAll');
        return successResponse(
          { 
            applications: [], 
            total: 0, 
            page: parsedPage, 
            limit: parsedLimit 
          },
          'No applications found'
        );
      }
      
      const { applications, total } = await this.jobApplicationService.findAll(
        userId,
        userType,
        filter,
        parsedPage,
        parsedLimit,
        status
      );
      
      return successResponse(
        { 
          applications, 
          total, 
          page: parsedPage, 
          limit: parsedLimit 
        },
        'Job applications retrieved successfully'
      );
    } catch (error) {
      console.error('Error finding job applications:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Post(':id/view-resume')
  viewResume(
    @Param('id') id: string,
    @CurrentUser('id') employerId: string,
  ): Promise<JobApplication> {
    return this.jobApplicationService.viewResume(id, employerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/admin-action')
  adminAction(
    @Param('id') id: string,
    @Body() updateJobApplicationDto: UpdateJobApplicationDto,
    @CurrentUser('id') adminId: string,
  ): Promise<JobApplication> {
    return this.jobApplicationService.update(id, updateJobApplicationDto, adminId, true);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ): Promise<JobApplication> {
    return this.jobApplicationService.findOne(id, userId, isAdmin);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateJobApplicationDto: UpdateJobApplicationDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ): Promise<JobApplication> {
    return this.jobApplicationService.update(id, updateJobApplicationDto, userId, isAdmin);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ): Promise<void> {
    return this.jobApplicationService.remove(id, userId, isAdmin);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job application status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(JobApplicationStatus),
          example: 'approved'
        }
      }
    }
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req,
  ) {
    try {
      const userId = req.user.sub;
      const isAdmin = req.user.isAdmin;
      
      console.log('Updating status:', {
        id,
        status: updateStatusDto.status,
        userId,
        isAdmin,
        validStatuses: Object.values(JobApplicationStatus)
      });
      
      const application = await this.jobApplicationService.updateStatus(
        id, 
        updateStatusDto.status, 
        userId, 
        isAdmin
      );
      
      return successResponse(application, 'Application status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Get('admin/manage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin endpoint to manage all job applications' })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, enum: JobApplicationStatus })
  @ApiQuery({ name: 'jobId', required: false })
  @ApiQuery({ name: 'applicantId', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  async adminManageApplications(
    @Request() req,
    @Query() query: {
      status?: JobApplicationStatus;
      jobId?: string;
      applicantId?: string;
      companyId?: string;
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ) {
    try {
      // Parse page and limit
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 10;
      
      // Create a custom where clause for admin filtering
      const customWhere: any = {};
      
      // Add status filter if provided
      if (query.status) {
        customWhere.status = query.status;
      }
      
      // Add job filter if provided
      if (query.jobId) {
        customWhere.jobId = query.jobId;
      }
      
      // Add applicant filter if provided
      if (query.applicantId) {
        customWhere.applicantId = query.applicantId;
      }
      
      // Add company filter if provided
      if (query.companyId) {
        // Get all jobs from this company
        const jobs = await this.jobService.findAll({
          companyId: query.companyId
        });
        
        // Extract job IDs
        const jobIds = jobs.jobs.map(job => job.id);
        
        if (jobIds.length > 0) {
          customWhere.jobId = { [Op.in]: jobIds };
        }
      }
      
      // Get applications with admin privileges
      const { applications, total } = await this.jobApplicationService.findAllWithCustomWhere(
        customWhere,
        page,
        limit,
        query.sortBy || 'createdAt',
        query.sortOrder || 'DESC'
      );
      
      return successResponse(
        { applications, total, page, limit },
        'Applications retrieved successfully'
      );
    } catch (error) {
      console.error('Error retrieving applications:', error);
      throw new BadRequestException(error.message);
    }
  }

  @Patch('admin/update-status/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin endpoint to update application status' })
  @ApiResponse({ status: 200, description: 'Application status updated successfully' })
  async adminUpdateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req
  ) {
    try {
      const application = await this.jobApplicationService.updateStatus(
        id,
        updateStatusDto.status,
        req.user.sub,
        true // isAdmin = true
      );
      
      return successResponse(application, 'Application status updated successfully');
    } catch (error) {
      console.error('Error updating application status:', error);
      throw new BadRequestException(error.message);
    }
  }

  @Post('admin/add-notes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin endpoint to add notes to an application' })
  @ApiResponse({ status: 200, description: 'Notes added successfully' })
  async adminAddNotes(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req
  ) {
    try {
      const application = await this.jobApplicationService.addAdminNotes(
        id,
        notes,
        req.user.sub
      );
      
      return successResponse(application, 'Notes added successfully');
    } catch (error) {
      console.error('Error adding notes:', error);
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('jobs/candidate/applications/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get job application with resume and job details' })
  @ApiResponse({ status: 200, description: 'Application details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized access' })
  async getApplicationWithDetails(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user.sub;
      const userType = req.user.userType;
      
      // Get application with resume and job details
      const applicationData = await this.jobApplicationService.getApplicationWithDetails(id, userId, userType);
      
      return successResponse(
        applicationData,
        'Application details retrieved successfully'
      );
    } catch (error) {
      console.error('Error retrieving application details:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Get('job/:jobId/can-apply')
  @ApiOperation({ summary: 'Check if a job can accept more applications (employer limit only)' })
  @ApiResponse({ status: 200, description: 'Job application availability checked successfully' })
  async canJobAcceptMoreApplications(@Param('jobId') jobId: string) {
    try {
      const result = await this.jobApplicationService.canJobAcceptMoreApplications(jobId);
      return successResponse(result, 'Job application availability checked successfully');
    } catch (error) {
      console.error('Error checking job application availability:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Get('job/:jobId/can-apply-full-check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user can apply to a specific job (both candidate and employer limits)' })
  @ApiResponse({ status: 200, description: 'Full application eligibility checked successfully' })
  async canUserApplyToJob(@Param('jobId') jobId: string, @Request() req) {
    try {
      // Check candidate daily limit
      const { canApply: candidateCanApply, remainingApplications } = await this.candidatePaymentService.checkApplicationLimit(req.user.sub);
      const candidatePaymentStats = await this.candidatePaymentService.getUserPaymentStats(req.user.sub);
      
      // Check job-specific limit (employer side)
      const jobLimitResult = await this.jobApplicationService.canJobAcceptMoreApplications(jobId);
      
      // Check if user has already applied
      const existingApplication = await this.jobApplicationService.findAll(
        req.user.sub,
        'candidate',
        'candidate',
        1,
        1,
        undefined
      );
      
      const hasAlreadyApplied = existingApplication.applications.some(app => app.jobId === jobId);
      
      // Determine overall eligibility
      const canApply = candidateCanApply && jobLimitResult.canApply && !hasAlreadyApplied;
      
      let blockingReason = null;
      if (!candidateCanApply) {
        if (!candidatePaymentStats.hasPaid) {
          blockingReason = 'CANDIDATE_PAYMENT_REQUIRED';
        } else {
          blockingReason = 'CANDIDATE_DAILY_LIMIT_REACHED';
        }
      } else if (!jobLimitResult.canApply) {
        blockingReason = 'JOB_LIMIT_REACHED';
      } else if (hasAlreadyApplied) {
        blockingReason = 'ALREADY_APPLIED';
      }
      
      return successResponse({
        canApply,
        blockingReason,
        candidateLimit: {
          canApply: candidateCanApply,
          dailyLimit: candidatePaymentStats.dailyLimit,
          applicationsUsedToday: candidatePaymentStats.applicationsUsedToday,
          remainingApplications,
          hasPaid: candidatePaymentStats.hasPaid
        },
        jobLimit: jobLimitResult,
        hasAlreadyApplied
      }, 'Full application eligibility checked successfully');
    } catch (error) {
      console.error('Error checking full application eligibility:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Post('test/enable-candidate-applications/:userId')
  @ApiOperation({ summary: 'Enable candidate applications for testing (Development only)' })
  @ApiResponse({ status: 200, description: 'Candidate applications enabled successfully' })
  async enableCandidateApplicationsForTesting(@Param('userId') userId: string) {
    try {
      // This is for testing purposes - manually set hasPaid to true
      await this.candidatePaymentService.manuallyUpdatePaymentStatus(userId, true);
      return successResponse(
        { userId, hasPaid: true },
        'Candidate applications enabled for testing'
      );
    } catch (error) {
      console.error('Error enabling candidate applications:', error.message);
      throw new BadRequestException(error.message);
    }
  }
} 