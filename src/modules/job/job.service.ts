import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Job, JobStatus, VerificationStatus } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { User } from '../user/entities/user.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { Op } from 'sequelize';
import { VerifyJobDto } from './dto/verify-job.dto';
import { Company } from '../company/entities/company.entity';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    @InjectModel(Job)
    private jobModel: typeof Job,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Company)
    private companyModel: typeof Company,
    private subscriptionService: SubscriptionService,
    private sequelize: Sequelize,
  ) {}

  /**
   * Create a new job posting
   */
  async create(userId: string, createJobDto: CreateJobDto, attachmentUrl?: string): Promise<Job> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Check if user exists
      const user = await this.userModel.findByPk(userId, { transaction });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Check if user has an active subscription
      const subscriptions = await this.subscriptionService.getUserSubscriptions(userId);
      
      if (!subscriptions || subscriptions.length === 0) {
        throw new BadRequestException('You need an active subscription to post jobs');
      }
      
      // Check if user has reached their job posting limit
      const activeJobs = await this.jobModel.count({
        where: {
          userId,
          status: {
            [Op.ne]: JobStatus.EXPIRED
          }
        },
        transaction
      });
      
      // Get the highest number of jobs allowed from all active subscriptions
      const maxJobs = Math.max(...subscriptions.map(sub => sub.plan.numberOfJobs));
      
      if (activeJobs >= maxJobs) {
        throw new BadRequestException(`You have reached your limit of ${maxJobs} active job postings. Please upgrade your subscription or remove some existing jobs.`);
      }
      
      // Check if company exists if companyId is provided
      if (createJobDto.companyId) {
        const company = await this.companyModel.findByPk(createJobDto.companyId, { transaction });
        if (!company) {
          throw new NotFoundException('Company not found');
        }
        
        // Check if company belongs to user
        if (company.userId !== userId) {
          throw new BadRequestException('You can only associate jobs with your own companies');
        }
      }
      
      // Create the job
      const job = await this.jobModel.create({
        ...createJobDto,
        userId,
        applicationDeadlineDate: createJobDto.applicationDeadlineDate ? new Date(createJobDto.applicationDeadlineDate) : null,
        attachmentUrl: attachmentUrl || null,
        verificationStatus: VerificationStatus.PENDING
      }, { transaction });
      
      await transaction.commit();
      return job;
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error creating job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all jobs with filtering options
   */
  async findAll(query: any = {}): Promise<{ jobs: Job[], total: number }> {
    const { 
      status = JobStatus.ACTIVE,
      category,
      jobType,
      country,
      city,
      industry,
      search,
      limit = 10,
      offset = 0,
      userId,
      companyId
    } = query;
    
    const whereClause: any = {};
    
    // Filter by status
    if (status) {
      whereClause.status = status;
    }
    
    // Filter by category
    if (category) {
      whereClause.category = category;
    }
    
    // Filter by job type
    if (jobType) {
      whereClause.jobType = jobType;
    }
    
    // Filter by country
    if (country) {
      whereClause.country = country;
    }
    
    // Filter by city
    if (city) {
      whereClause.city = city;
    }
    
    // Filter by industry
    if (industry) {
      whereClause.industry = industry;
    }
    
    // Filter by user ID
    if (userId) {
      whereClause.userId = userId;
    }
    
    // Filter by company ID
    if (companyId) {
      whereClause.companyId = companyId;
    }
    
    // Search in title and description
    if (search) {
      whereClause[Op.or] = [
        { jobTitle: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { jobDescription: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Get total count for pagination
    const total = await this.jobModel.count({ where: whereClause });
    
    // Get user attributes safely
    let userAttributes = ['id', 'firstName', 'lastName', 'email'];
    
    try {
      // Check if companyName exists in the User model
      const userModel = this.userModel;
      if (userModel.rawAttributes.companyName) {
        userAttributes.push('companyName');
      }
    } catch (error) {
      this.logger.warn('companyName attribute not found in User model');
    }
    
    // Get jobs with pagination
    const jobs = await this.jobModel.findAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: userAttributes
        },
        {
          model: Company,
          attributes: ['id', 'companyName', 'logoUrl', 'website']
        }
      ]
    });
    
    return { jobs, total };
  }

  /**
   * Find one job by ID
   */
  async findOne(id: string): Promise<Job> {
    const job = await this.jobModel.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email', 'companyName']
        },
        {
          model: Company,
          attributes: ['id', 'companyName', 'logoUrl', 'website']
        }
      ]
    });
    
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    
    return job;
  }

  /**
   * Update a job
   */
  async update(id: string, userId: string, updateJobDto: UpdateJobDto, attachmentUrl?: string): Promise<Job> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const job = await this.jobModel.findOne({
        where: { id, userId },
        transaction
      });
      
      if (!job) {
        throw new NotFoundException(`Job with ID ${id} not found or you don't have permission to update it`);
      }
      
      // Format application deadline date if provided
      if (updateJobDto.applicationDeadlineDate) {
        updateJobDto.applicationDeadlineDate = new Date(updateJobDto.applicationDeadlineDate).toISOString();
      }
      
      // Update the job
      const updateData: any = { ...updateJobDto };
      if (attachmentUrl) {
        updateData.attachmentUrl = attachmentUrl;
      }
      
      await job.update(updateData, { transaction });
      
      await transaction.commit();
      return this.findOne(id);
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error updating job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove a job
   */
  async remove(id: string, userId: string): Promise<void> {
    const job = await this.jobModel.findOne({
      where: { id, userId }
    });
    
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found or you don't have permission to delete it`);
    }
    
    await job.destroy();
  }

  /**
   * Increment application count
   */
  async incrementApplicationCount(id: string): Promise<void> {
    const job = await this.jobModel.findByPk(id);
    
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    
    await job.increment('applications');
  }

  /**
   * Get job statistics for a user
   */
  async getJobStats(userId: string): Promise<any> {
    const totalJobs = await this.jobModel.count({
      where: { userId }
    });
    
    const activeJobs = await this.jobModel.count({
      where: { 
        userId,
        status: JobStatus.ACTIVE
      }
    });
    
    const expiredJobs = await this.jobModel.count({
      where: { 
        userId,
        status: JobStatus.EXPIRED
      }
    });
    
    const totalViews = await this.jobModel.sum('views', {
      where: { userId }
    });
    
    const totalApplications = await this.jobModel.sum('applications', {
      where: { userId }
    });
    
    return {
      totalJobs,
      activeJobs,
      expiredJobs,
      totalViews: totalViews || 0,
      totalApplications: totalApplications || 0
    };
  }

  /**
   * Find all jobs with filtering options (admin version)
   */
  async findAllForAdmin(query: any = {}): Promise<{ jobs: Job[], total: number }> {
    const { 
      status,
      verificationStatus,
      category,
      jobType,
      country,
      city,
      industry,
      search,
      limit = 10,
      offset = 0,
      userId,
      companyId
    } = query;
    
    const whereClause: any = {};
    
    // Filter by status
    if (status) {
      whereClause.status = status;
    }
    
    // Filter by verification status
    if (verificationStatus) {
      whereClause.verificationStatus = verificationStatus;
    }
    
    // Filter by category
    if (category) {
      whereClause.category = category;
    }
    
    // Filter by job type
    if (jobType) {
      whereClause.jobType = jobType;
    }
    
    // Filter by country
    if (country) {
      whereClause.country = country;
    }
    
    // Filter by city
    if (city) {
      whereClause.city = city;
    }
    
    // Filter by industry
    if (industry) {
      whereClause.industry = industry;
    }
    
    // Filter by user ID
    if (userId) {
      whereClause.userId = userId;
    }
    
    // Filter by company ID
    if (companyId) {
      whereClause.companyId = companyId;
    }
    
    // Search in title and description
    if (search) {
      whereClause[Op.or] = [
        { jobTitle: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { jobDescription: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Get total count for pagination
    const total = await this.jobModel.count({ where: whereClause });
    
    // Get jobs with pagination
    const jobs = await this.jobModel.findAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email', 'companyName']
        },
        {
          model: Company,
          attributes: ['id', 'companyName', 'logoUrl', 'website']
        }
      ]
    });
    
    return { jobs, total };
  }

  /**
   * Find all active and approved jobs
   */
  async findAllActiveAndApproved(query: any = {}): Promise<{ jobs: Job[], total: number }> {
    return this.findAll({
      ...query,
      status: JobStatus.ACTIVE,
      verificationStatus: VerificationStatus.APPROVED
    });
  }

  /**
   * Verify a job (approve or reject)
   */
  async verifyJob(id: string, verifyJobDto: VerifyJobDto): Promise<Job> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const job = await this.jobModel.findByPk(id, { transaction });
      
      if (!job) {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }
      
      // If rejecting, require a reason
      if (verifyJobDto.verificationStatus === VerificationStatus.REJECTED && !verifyJobDto.rejectionReason) {
        throw new BadRequestException('Rejection reason is required when rejecting a job');
      }
      
      // Update the job
      await job.update({
        verificationStatus: verifyJobDto.verificationStatus,
        rejectionReason: verifyJobDto.rejectionReason || null
      }, { transaction });
      
      await transaction.commit();
      return this.findOne(id);
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error verifying job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Increment view count for a job
   */
  async incrementViewCount(id: string): Promise<void> {
    const job = await this.jobModel.findByPk(id);
    
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    
    await job.increment('views');
  }
}