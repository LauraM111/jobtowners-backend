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

  /**
   * Find all job applications with filtering
   */
  async findAll(filterDto: FilterJobApplicationDto, userId: string, isAdmin: boolean): Promise<JobApplication[]> {
    const where: any = {};
    const include: any[] = [];
    
    // Add job include with optional company filter
    const jobInclude: any = {
      model: this.jobModel,
      attributes: ['id', 'title', 'jobTitle', 'userId']
    };
    
    // Include resume but only select id field to avoid issues
    const resumeInclude: any = {
      model: this.resumeModel,
      attributes: ['id']
    };
    
    // Add applicant include
    const applicantInclude: any = {
      model: this.userModel,
      as: 'applicant',
      attributes: ['id', 'firstName', 'lastName', 'email']
    };
    
    // Filter by job ID
    if (filterDto.jobId) {
      where.jobId = filterDto.jobId;
    }
    
    // Filter by applicant ID
    if (filterDto.applicantId) {
      where.applicantId = filterDto.applicantId;
    }
    
    // Filter by status
    if (filterDto.status) {
      where.status = filterDto.status;
    }
    
    // Filter by user type
    if (filterDto.filter) {
      // If employer filter, show applications for employer's jobs
      if (filterDto.filter === 'employer' && (!isAdmin && userId)) {
        // Get all jobs by this employer
        const employerJobs = await this.jobModel.findAll({
          where: { userId },
          attributes: ['id']
        });
        
        if (employerJobs.length > 0) {
          where.jobId = {
            [Op.in]: employerJobs.map(job => job.id)
          };
        } else {
          // If employer has no jobs, return empty array
          return [];
        }
      }
      
      // If candidate filter, show only candidate's applications
      if (filterDto.filter === 'candidate') {
        where.applicantId = userId;
      }
    } else {
      // Default behavior if no filter specified
      if (!isAdmin && userId) {
        // Check if user is an employer
        const isEmployer = await this.isEmployer(userId);
        
        if (isEmployer) {
          // Get all jobs by this employer
          const employerJobs = await this.jobModel.findAll({
            where: { userId },
            attributes: ['id']
          });
          
          if (employerJobs.length > 0) {
            where.jobId = {
              [Op.in]: employerJobs.map(job => job.id)
            };
          } else {
            // If employer has no jobs, return empty array
            return [];
          }
        } else {
          // If not an employer, assume candidate and show only their applications
          where.applicantId = userId;
        }
      }
    }
    
    // Add includes
    include.push(jobInclude);
    include.push(resumeInclude);
    include.push(applicantInclude);
    
    // Pagination
    const limit = filterDto.limit || 20;
    const offset = ((filterDto.page || 1) - 1) * limit;
    
    // Execute query
    return this.jobApplicationModel.findAll({
      where,
      include,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }

  async findOne(id: string, userId?: string, isAdmin = false): Promise<JobApplication> {
    const jobApplication = await this.jobApplicationModel.findByPk(id, {
      include: [
        { 
          model: this.resumeModel, 
          attributes: ['id'] // Only select id to avoid issues
        },
        { 
          model: this.userModel, 
          as: 'applicant' 
        },
        { 
          model: this.jobModel
        }
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

  /**
   * Check if a user is an employer
   */
  private async isEmployer(userId: string): Promise<boolean> {
    try {
      // Check if the user has any jobs
      const jobCount = await this.jobModel.count({
        where: { userId }
      });
      
      return jobCount > 0;
    } catch (error) {
      console.error('Error checking if user is employer:', error);
      return false;
    }
  }

  /**
   * Find all unique applicants who applied to jobs posted by an employer
   */
  async findApplicantsByEmployer(employerId: string): Promise<any[]> {
    // First, get all jobs posted by this employer
    const jobs = await this.jobModel.findAll({
      where: { userId: employerId },
      attributes: ['id']
    });
    
    if (jobs.length === 0) {
      return [];
    }
    
    const jobIds = jobs.map(job => job.id);
    
    // Get all applications for these jobs with applicant details
    const applications = await this.jobApplicationModel.findAll({
      where: {
        jobId: {
          [Op.in]: jobIds
        }
      },
      include: [
        {
          model: this.userModel,
          as: 'applicant',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        },
        {
          model: this.jobModel,
          attributes: ['id', 'title', 'jobTitle']
        },
        {
          model: this.resumeModel,
          attributes: ['id'] // Only select id to avoid issues
        }
      ]
    });
    
    // Group applications by applicant
    const applicantsMap = new Map();
    
    applications.forEach(application => {
      const applicant = application.applicant;
      
      if (!applicantsMap.has(applicant.id)) {
        // Initialize applicant entry with initials
        const initials = `${applicant.firstName.charAt(0)}${applicant.lastName.charAt(0)}`.toUpperCase();
        
        applicantsMap.set(applicant.id, {
          id: applicant.id,
          firstName: applicant.firstName,
          lastName: applicant.lastName,
          email: applicant.email,
          phoneNumber: applicant.phoneNumber,
          initials: initials,
          applications: []
        });
      }
      
      // Add this application to the applicant's applications
      applicantsMap.get(applicant.id).applications.push({
        id: application.id,
        jobId: application.jobId,
        jobTitle: application.job.title,
        position: application.job.jobTitle,
        status: application.status,
        appliedAt: application.createdAt,
        resumeId: application.resumeId
        // Use job title instead of resume title
      });
    });
    
    // Convert map to array
    return Array.from(applicantsMap.values());
  }

  /**
   * Update just the status of a job application
   */
  async updateStatus(id: string, status: JobApplicationStatus, userId: string, isAdmin = false): Promise<JobApplication> {
    const jobApplication = await this.findOne(id, userId, isAdmin);
    
    console.log('Status update request:', {
      currentStatus: jobApplication.status,
      newStatus: status,
      isApplicant: jobApplication.applicantId === userId,
      validStatuses: Object.values(JobApplicationStatus)
    });
    
    // Check permissions based on the status change
    if (!isAdmin) {
      // If user is the applicant
      if (jobApplication.applicantId === userId) {
        // Applicants can only withdraw their applications
        if (status !== JobApplicationStatus.WITHDRAWN) {
          throw new ForbiddenException('You can only withdraw your application');
        }
      } 
      // If user is the employer
      else {
        // Check if the employer owns the job
        const job = await this.jobService.findOne(jobApplication.jobId);
        
        console.log('Employer job check:', {
          jobUserId: job.userId,
          requestUserId: userId,
          isOwner: job.userId === userId
        });
        
        if (job.userId !== userId) {
          throw new ForbiddenException('You do not have permission to update this application');
        }
        
        // Employers can use all statuses except WITHDRAWN (which is reserved for candidates)
        if (status === JobApplicationStatus.WITHDRAWN) {
          throw new ForbiddenException('Only candidates can withdraw applications');
        }
      }
    }

    // Update the status
    await jobApplication.update({ status });
    return jobApplication;
  }
} 