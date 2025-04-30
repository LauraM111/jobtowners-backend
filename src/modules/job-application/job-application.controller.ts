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
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { successResponse } from '../../utils/response-utils';

@Controller('job-applications')
export class JobApplicationController {
  constructor(private readonly jobApplicationService: JobApplicationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job application' })
  @ApiResponse({ status: 201, description: 'Job application created successfully' })
  @ApiBearerAuth()
  async create(@Request() req, @Body() createJobApplicationDto: CreateJobApplicationDto) {
    const userId = req.user.sub;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    
    const jobApplication = await this.jobApplicationService.create(userId, createJobApplicationDto);
    return successResponse(jobApplication, 'Job application created successfully');
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
} 