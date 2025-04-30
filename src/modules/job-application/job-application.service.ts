import { BadRequestException, ForbiddenException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { JobApplication, JobApplicationStatus } from './entities/job-application.entity';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { FilterJobApplicationDto } from './dto/filter-job-application.dto';
import { JobService } from '../job/job.service';
import { ResumeService } from '../resume/resume.service';
import { UserService } from '../user/user.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { User } from '../user/entities/user.entity';
import { Resume } from '../resume/entities/resume.entity';
import { Job } from '../job/entities/job.entity';

@Injectable()
export class JobApplicationService {
  constructor(
    @InjectModel(JobApplication)
    private jobApplicationModel: typeof JobApplication,
    private jobService: JobService,
    private resumeService: ResumeService,
    private userService: UserService,
    private subscriptionService: SubscriptionService,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Resume)
    private resumeModel: typeof Resume,
    @InjectModel(Job)
    private jobModel: typeof Job,
  ) {}

  async create(userId: string, createJobApplicationDto: CreateJobApplicationDto): Promise<JobApplication> {
    console.log('Creating job application for user:', userId);
    console.log('Job application data:', createJobApplicationDto);
    
    // First, verify that the resume belongs to the current user
    const resume = await this.resumeService.findOne(createJobApplicationDto.resumeId);
    
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }
    
    if (resume.userId !== userId) {
      throw new BadRequestException('Resume does not belong to the current user');
    }
    
    // Check if job exists
    const job = await this.jobService.findOne(createJobApplicationDto.jobId);
    if (!job) {
      console.log('Job not found with ID:', createJobApplicationDto.jobId);
      throw new NotFoundException('Job not found');
    }
    console.log('Job found:', job.id);

    // Check if user has already applied for this job
    const existingApplication = await this.jobApplicationModel.findOne({
      where: {
        applicantId: userId,
        jobId: createJobApplicationDto.jobId,
      },
    });

    if (existingApplication) {
      throw new BadRequestException('You have already applied for this job');
    }

    return this.jobApplicationModel.create({
      applicantId: userId,
      jobId: createJobApplicationDto.jobId,
      resumeId: createJobApplicationDto.resumeId,
      coverLetter: createJobApplicationDto.coverLetter,
      status: JobApplicationStatus.PENDING,
    });
  }

  async findAll(filterDto: FilterJobApplicationDto, userId?: string, isAdmin = false): Promise<JobApplication[]> {
    const whereClause: any = {};
    
    // Apply filters
    if (filterDto.jobId) {
      whereClause.jobId = filterDto.jobId;
    }

    if (filterDto.applicantId) {
      whereClause.applicantId = filterDto.applicantId;
    }

    if (filterDto.status) {
      whereClause.status = filterDto.status;
    }

    // If not admin, restrict access based on user role
    if (!isAdmin && userId) {
      const user = await this.userService.findOne(userId);
      
      // Check if user is an employer by checking if they have any companies
      const isEmployer = await this.isEmployer(userId);
      
      if (isEmployer) {
        // For employers, we need to join with jobs to filter by employerId
        // This will be handled in the include options
      } else {
        // Regular users can only see their own applications
        whereClause.applicantId = userId;
      }
    }

    // Build include options for related models
    const includeOptions = [
      { 
        model: this.resumeModel,
        as: 'resume'
      },
      {
        model: this.userModel,
        as: 'applicant'
      }
    ];

    // Add job include with filtering if needed
    const jobInclude: any = {
      model: this.jobModel,
      as: 'job'
    };

    // Add company include to job if needed
    if (filterDto.companyId) {
      jobInclude.where = { companyId: filterDto.companyId };
    }

    // Add employer filtering if needed
    if (filterDto.employerId || (!isAdmin && userId && await this.isEmployer(userId))) {
      jobInclude.where = {
        ...jobInclude.where,
        userId: filterDto.employerId || userId
      };
    }

    includeOptions.push(jobInclude);

    // Add search term filtering if provided
    if (filterDto.searchTerm) {
      const searchPattern = `%${filterDto.searchTerm}%`;
      whereClause[Op.or] = [
        { '$resume.skills$': { [Op.like]: searchPattern } },
        { '$resume.summary$': { [Op.like]: searchPattern } },
        { '$job.title$': { [Op.like]: searchPattern } }
      ];
    }

    return this.jobApplicationModel.findAll({
      where: whereClause,
      include: includeOptions
    });
  }

  async findOne(id: string, userId?: string, isAdmin = false): Promise<JobApplication> {
    const jobApplication = await this.jobApplicationModel.findByPk(id, {
      include: [
        { model: this.resumeModel, as: 'resume' },
        { model: this.userModel, as: 'applicant' },
        { model: this.jobModel, as: 'job' }
      ]
    });

    if (!jobApplication) {
      throw new NotFoundException('Job application not found');
    }

    // If not admin, check permissions
    if (!isAdmin && userId) {
      const isEmployer = await this.isEmployer(userId);
      
      if (isEmployer) {
        const job = await this.jobService.findOne(jobApplication.jobId);
        if (job.userId !== userId) {
          throw new ForbiddenException('You do not have permission to view this application');
        }
      } else if (jobApplication.applicantId !== userId) {
        throw new ForbiddenException('You do not have permission to view this application');
      }
    }

    return jobApplication;
  }

  async update(id: string, updateJobApplicationDto: UpdateJobApplicationDto, userId: string, isAdmin = false): Promise<JobApplication> {
    const jobApplication = await this.findOne(id, userId, isAdmin);
    
    // Only admin or the applicant can update the application
    if (!isAdmin && jobApplication.applicantId !== userId) {
      throw new ForbiddenException('You do not have permission to update this application');
    }

    // If not admin, restrict what can be updated
    if (!isAdmin) {
      // Regular users can only withdraw their applications or update cover letter
      if (updateJobApplicationDto.status && updateJobApplicationDto.status !== JobApplicationStatus.WITHDRAWN) {
        throw new ForbiddenException('You can only withdraw your application');
      }
      
      delete updateJobApplicationDto.adminNotes;
    }

    await jobApplication.update(updateJobApplicationDto);
    return jobApplication;
  }

  async remove(id: string, userId: string, isAdmin = false): Promise<void> {
    const jobApplication = await this.findOne(id, userId, isAdmin);
    
    // Only admin or the applicant can delete the application
    if (!isAdmin && jobApplication.applicantId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this application');
    }

    await jobApplication.destroy();
  }

  async viewResume(applicationId: string, employerId: string): Promise<JobApplication> {
    const jobApplication = await this.findOne(applicationId, employerId);
    
    // Check if the employer owns the job
    const job = await this.jobService.findOne(jobApplication.jobId);
    if (job.userId !== employerId) {
      throw new ForbiddenException('You do not have permission to view this resume');
    }

    // Check if resume has already been viewed
    if (jobApplication.isResumeViewed) {
      return jobApplication;
    }

    // Check subscription plan and resume view count
    const subscriptions = await this.subscriptionService.getUserSubscriptions(employerId);
    if (!subscriptions || subscriptions.length === 0) {
      throw new ForbiddenException('You need an active subscription to view resumes');
    }
    
    const subscription = subscriptions[0]; // Get the most recent subscription

    const viewedResumesCount = await this.jobApplicationModel.count({
      where: {
        isResumeViewed: true,
        viewedBy: employerId,
        viewedAt: {
          [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) // Last month
        }
      },
    });

    if (viewedResumesCount >= subscription.plan.resumeViewsCount) {
      throw new ForbiddenException('You have reached your monthly resume view limit');
    }

    // Mark resume as viewed
    await jobApplication.update({
      isResumeViewed: true,
      viewedAt: new Date(),
      viewedBy: employerId
    });

    return jobApplication;
  }

  // Helper method to check if a user is an employer
  private async isEmployer(userId: string): Promise<boolean> {
    try {
      // Check if the user has any companies
      const companies = await this.userModel.sequelize.models.Company.findAll({
        where: { userId }
      });
      
      return companies && companies.length > 0;
    } catch (error) {
      console.error('Error checking if user is employer:', error);
      return false;
    }
  }
} 