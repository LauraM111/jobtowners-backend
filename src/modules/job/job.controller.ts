import { 
  Controller, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, Request, Query, UseInterceptors, UploadedFile,
  BadRequestException, UploadedFiles, Put
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../user/entities/user.entity';
import { successResponse } from '../../common/helpers/response.helper';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Public } from '../auth/decorators/public.decorator';
import { VerifyJobDto } from './dto/verify-job.dto';
import { VerificationStatus } from './entities/job.entity';
import { JobStatus } from './entities/job.entity';
import { JwtService } from '@nestjs/jwt';

@ApiTags('Jobs')
@Controller('jobs')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly jwtService: JwtService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new job posting' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('attachment', {
    storage: diskStorage({
      destination: './uploads/jobs',
      filename: (req, file, cb) => {
        const randomName = uuidv4();
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(pdf|doc|docx|txt)$/)) {
        return cb(new BadRequestException('Only PDF, DOC, DOCX, and TXT files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  async create(
    @Request() req,
    @Body() createJobDto: CreateJobDto,
    @UploadedFile() attachment: Express.Multer.File
  ) {
    try {
      const attachmentUrl = attachment ? `/uploads/jobs/${attachment.filename}` : null;
      const job = await this.jobService.create(req.user.sub, createJobDto, attachmentUrl);
      return successResponse(job, 'Job created successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  
  async uploadAdditionalAttachments(
    @Request() req,
    @Param('id') id: string,
    @UploadedFiles() attachments: Array<Express.Multer.File>
  ) {
    try {
      const job = await this.jobService.findOne(id);
      
      // Check if the job belongs to the user
      if (job.userId !== req.user.sub) {
        throw new BadRequestException('You do not have permission to update this job');
      }
      
      const attachmentUrls = attachments.map(file => `/uploads/jobs/${file.filename}`);
      
      // Update the job with the new attachments
      const existingAttachments = job.additionalAttachments || [];
      const updatedJob = await this.jobService.update(
        id, 
        req.user.sub, 
        { additionalAttachments: [...existingAttachments, ...attachmentUrls] }
      );
      
      return successResponse(updatedJob, 'Attachments uploaded successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all jobs' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: JobStatus })
  @ApiQuery({ name: 'verificationStatus', required: false, enum: VerificationStatus })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: JobStatus,
    @Query('verificationStatus') verificationStatus?: VerificationStatus,
    @Query('userId') userId?: string,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    // Extract token from Authorization header
    let currentUserId = null;
    
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Decode the JWT token to get user ID
        const decoded = this.jwtService.decode(token);
        if (decoded && decoded.sub) {
          currentUserId = decoded.sub;
        }
      }
    } catch (error) {
      console.log('Error extracting user from token:', error);
    }
    
    const { jobs, total } = await this.jobService.findAll({
      limit,
      offset,
      status,
      verificationStatus,
      userId,
      companyId,
      search,
      currentUserId
    });
    
    return successResponse({ jobs, total }, 'Jobs retrieved successfully');
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all jobs (Admin only)' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async findAllForAdmin(@Query() query) {
    const { jobs, total } = await this.jobService.findAllForAdmin(query);
    return successResponse({ jobs, total }, 'Jobs retrieved successfully');
  }

  @Get('active-approved')
  @Public()
  @ApiOperation({ summary: 'Get all active and approved jobs' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async findAllActiveAndApproved(@Query() query) {
    const { jobs, total } = await this.jobService.findAllActiveAndApproved(query);
    return successResponse({ jobs, total }, 'Jobs retrieved successfully');
  }

  @Get('my-jobs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s jobs' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async findUserJobs(@Request() req, @Query() query) {
    const { jobs, total } = await this.jobService.findAll({ ...query, userId: req.user.sub });
    return successResponse({ jobs, total }, 'Jobs retrieved successfully');
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get job statistics for current user' })
  @ApiResponse({ status: 200, description: 'Job statistics retrieved successfully' })
  async getJobStats(@Request() req) {
    const stats = await this.jobService.getJobStats(req.user.sub);
    return successResponse(stats, 'Job statistics retrieved successfully');
  }

  @Get('saved/user/jobs/list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s saved jobs' })
  @ApiResponse({ status: 200, description: 'Saved jobs retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSavedJobs(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    try {
      const offset = page ? (page - 1) * (limit || 10) : 0;
      const { jobs, total } = await this.jobService.getSavedJobs(req.user.sub, { limit, offset });
      return successResponse({ jobs, total, page: page || 1 }, 'Saved jobs retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job by ID' })
  @ApiResponse({ status: 200, description: 'Job retrieved successfully' })
  @ApiQuery({ name: 'view', required: false, type: Boolean, description: 'Set to true to increment view count' })
  async findOne(
    @Param('id') id: string, 
    @Query('view') view?: boolean,
    @Request() req?: any
  ) {
    try {
      // Extract token from Authorization header
      let currentUserId = null;
      
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          // Decode the JWT token to get user ID
          const decoded = this.jwtService.decode(token);
          if (decoded && decoded.sub) {
            currentUserId = decoded.sub;
          }
        }
      } catch (error) {
        console.log('Error extracting user from token:', error);
      }
      
      const job = await this.jobService.findOne(id, currentUserId);
      
      // Increment view count if requested
      if (view === true) {
        await this.jobService.incrementViewCount(id);
      }
      
      return successResponse(job, 'Job retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch(':id/update-details')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a job' })
  @ApiResponse({ status: 200, description: 'Job updated successfully' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('attachment', {
    storage: diskStorage({
      destination: './uploads/jobs',
      filename: (req, file, cb) => {
        const randomName = uuidv4();
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(pdf|doc|docx|txt)$/)) {
        return cb(new BadRequestException('Only PDF, DOC, DOCX, and TXT files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() rawUpdateData: any,
    @UploadedFile() attachment: Express.Multer.File
  ) {
    try {
      // Define allowed fields for update
      const allowedFields = [
        'jobTitle', 'title', 'jobDescription', 'emailAddress', 'specialisms',
        'category', 'jobType', 'offeredSalary', 'careerLevel', 'experience',
        'gender', 'industry', 'qualification', 'applicationDeadlineDate',
        'country', 'city', 'completeAddress', 'status', 'additionalAttachments',
        'companyId'
      ];
      
      // Create a clean DTO with proper typing
      const cleanUpdateDto: Record<string, any> = {};
      
      // Only copy allowed fields
      for (const field of allowedFields) {
        if (field in rawUpdateData) {
          cleanUpdateDto[field] = rawUpdateData[field];
        }
      }
      
      // Special handling for additionalAttachments if it's a string
      if (typeof cleanUpdateDto.additionalAttachments === 'string') {
        try {
          cleanUpdateDto.additionalAttachments = JSON.parse(cleanUpdateDto.additionalAttachments);
        } catch (e) {
          // If it's not valid JSON, keep it as is
          console.log('Could not parse additionalAttachments as JSON:', e);
        }
      }
      
      // Special handling for specialisms if it's a string
      if (typeof cleanUpdateDto.specialisms === 'string') {
        try {
          cleanUpdateDto.specialisms = JSON.parse(cleanUpdateDto.specialisms);
        } catch (e) {
          // If it's not valid JSON, keep it as is
          console.log('Could not parse specialisms as JSON:', e);
        }
      }
      
      console.log('Clean update DTO:', cleanUpdateDto);
      
      const attachmentUrl = attachment ? `/uploads/jobs/${attachment.filename}` : null;
      const job = await this.jobService.update(id, req.user.sub, cleanUpdateDto, attachmentUrl);
      return successResponse(job, 'Job updated successfully');
    } catch (error) {
      console.error('Error updating job:', error);
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a job' })
  @ApiResponse({ status: 200, description: 'Job deleted successfully' })
  async remove(@Request() req, @Param('id') id: string) {
    try {
      await this.jobService.remove(id, req.user.sub);
      return successResponse(null, 'Job deleted successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post(':id/increment-application')
  @Public()
  @ApiOperation({ summary: 'Increment application count for a job' })
  @ApiResponse({ status: 200, description: 'Application count incremented successfully' })
  async incrementApplicationCount(@Param('id') id: string) {
    try {
      await this.jobService.incrementApplicationCount(id);
      return successResponse(null, 'Application count incremented successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a job (Admin only)' })
  @ApiResponse({ status: 200, description: 'Job verified successfully' })
  async verifyJob(
    @Param('id') id: string,
    @Body() verifyJobDto: VerifyJobDto
  ) {
    try {
      const job = await this.jobService.verifyJob(id, verifyJobDto);
      return successResponse(job, 'Job verified successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('company/:companyId')
  @Public()
  @ApiOperation({ summary: 'Get jobs by company ID' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: JobStatus })
  async getJobsByCompany(
    @Param('companyId') companyId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: JobStatus,
  ) {
    const { jobs, total } = await this.jobService.findAll({
      limit,
      offset,
      status,
      verificationStatus: VerificationStatus.APPROVED,
      companyId
    });
    
    return successResponse({ jobs, total }, 'Company jobs retrieved successfully');
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a job for later' })
  @ApiResponse({ status: 200, description: 'Job saved successfully' })
  async saveJob(@Request() req, @Param('id') id: string) {
    try {
      await this.jobService.saveJob(req.user.sub, id);
      return successResponse(null, 'Job saved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a job from saved jobs' })
  @ApiResponse({ status: 200, description: 'Job removed from saved jobs' })
  async unsaveJob(@Request() req, @Param('id') id: string) {
    try {
      await this.jobService.unsaveJob(req.user.sub, id);
      return successResponse(null, 'Job removed from saved jobs');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
} 