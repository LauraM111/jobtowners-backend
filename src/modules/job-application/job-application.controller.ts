import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JobApplicationService } from './job-application.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { FilterJobApplicationDto } from './dto/filter-job-application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserType } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JobApplication } from './entities/job-application.entity';
import { ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { successResponse } from '../../utils/response-utils';
import { CandidatePaymentService } from '../candidate-payment/candidate-payment.service';
import { JobApplicationStatus } from './entities/job-application.entity';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('job-applications')
export class JobApplicationController {
  constructor(
    private readonly jobApplicationService: JobApplicationService,
    private readonly candidatePaymentService: CandidatePaymentService,
  ) {}

  @Get('employer-applicants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of candidates who applied to employer jobs' })
  @ApiResponse({ status: 200, description: 'Candidates retrieved successfully' })
  async getJobApplicants(@Request() req) {
    try {
      const employerId = req.user.sub;
      const applicants = await this.jobApplicationService.findApplicantsByEmployer(employerId);
      return successResponse(applicants, 'Candidates retrieved successfully');
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
      // Check if user has paid and has available application slots
      const { canApply, remainingApplications } = await this.candidatePaymentService.checkApplicationLimit(req.user.sub);
      
      if (!canApply) {
        throw new BadRequestException('You need to make a payment or have reached your daily application limit');
      }
      
      // Create the application
      const application = await this.jobApplicationService.create(req.user.sub, createJobApplicationDto);
      
      // Increment application count
      await this.candidatePaymentService.incrementApplicationCount(req.user.sub);
      
      return successResponse(
        { application, remainingApplications: remainingApplications - 1 },
        'Application submitted successfully'
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
    @Query() filterDto: FilterJobApplicationDto,
  ): Promise<JobApplication[]> {
    return this.jobApplicationService.findAll(filterDto, userId, isAdmin);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer' as UserType, 'admin' as UserType)
  @Post(':id/view-resume')
  viewResume(
    @Param('id') id: string,
    @CurrentUser('id') employerId: string,
  ): Promise<JobApplication> {
    return this.jobApplicationService.viewResume(id, employerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as UserType)
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
} 