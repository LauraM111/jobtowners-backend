import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Job, JobStatus, VerificationStatus, JobType } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { User } from '../user/entities/user.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { Op } from 'sequelize';
import { VerifyJobDto } from './dto/verify-job.dto';
import { Company } from '../company/entities/company.entity';
import { SavedJob } from './entities/saved-job.entity';

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
    @InjectModel(SavedJob)
    private savedJobModel: typeof SavedJob,
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
        if (company.userId.toString() !== userId) {
          throw new ForbiddenException('You do not have permission to create a job for this company');
        }
      }
      
      // Prepare job data, handling empty email addresses
      const jobData = {
        ...createJobDto,
        userId,
        applicationDeadlineDate: createJobDto.applicationDeadlineDate ? new Date(createJobDto.applicationDeadlineDate) : null,
        attachmentUrl: attachmentUrl || null,
        verificationStatus: VerificationStatus.PENDING,
        // Convert empty email string to null
        emailAddress: createJobDto.emailAddress && createJobDto.emailAddress.trim() !== '' 
          ? createJobDto.emailAddress 
          : null
      };

      // Create the job
      const job = await this.jobModel.create(jobData, { transaction });
      
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
      limit, 
      offset, 
      status, 
      verificationStatus, 
      userId, 
      companyId, 
      search,
      query: searchQuery,
      jobType,
      category,
      experience,
      careerLevel,
      location,
      latitude,
      longitude,
      radius = 25, // Default radius is 25 miles
      sort,
      currentUserId,
      debug = false
    } = query;
    
    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (verificationStatus) {
      where.verificationStatus = verificationStatus;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (companyId) {
      where.companyId = companyId;
    }
    
    // Handle multiple job types (comma-separated)
    if (jobType) {
      if (jobType.includes(',')) {
        const jobTypes = jobType.split(',');
        where.jobType = { [Op.in]: jobTypes };
      } else {
        where.jobType = jobType;
      }
    }
    
    if (category) {
      where.category = category;
    }
    
    if (experience) {
      where.experience = experience;
    }
    
    // Add careerLevel filter
    if (careerLevel) {
      where.careerLevel = careerLevel;
    }
    
    // Handle search parameter (existing functionality)
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { jobTitle: { [Op.like]: `%${search}%` } },
        { jobDescription: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Handle query parameter (new functionality)
    if (searchQuery) {
      where[Op.or] = [
        { title: { [Op.like]: `%${searchQuery}%` } },
        { jobTitle: { [Op.like]: `%${searchQuery}%` } },
        { jobDescription: { [Op.like]: `%${searchQuery}%` } }
      ];
    }
    
    // Handle location-based search
    if (location) {
      this.logger.log(`Searching for jobs with location: ${location}`);
      
      // Extract potential parts from the location string
      const locationParts = location.split(',').map(part => part.trim());
      
      // Create a more flexible search pattern
      const searchPattern = `%${locationParts.join('%')}%`;
      this.logger.log(`Using search pattern: ${searchPattern}`);
      
      // Create a simpler OR condition that's more likely to match
      const locationConditions = [
        { completeAddress: { [Op.like]: searchPattern } },
        { city: { [Op.like]: `%${locationParts[0]}%` } }, // First part is usually city
        { state: { [Op.like]: `%${locationParts[1] || ''}%` } }, // Second part is usually state
        { country: { [Op.like]: `%${locationParts[2] || ''}%` } } // Third part is usually country
      ];
      
      // For each individual part, also search in all location fields
      for (const part of locationParts) {
        if (part && part.length > 2) { // Only search for parts with at least 3 characters
          locationConditions.push(
            { completeAddress: { [Op.like]: `%${part}%` } },
            { city: { [Op.like]: `%${part}%` } },
            { state: { [Op.like]: `%${part}%` } },
            { country: { [Op.like]: `%${part}%` } }
          );
        }
      }
      
      // Combine with existing OR conditions if they exist
      if (where[Op.or]) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({ [Op.or]: locationConditions });
      } else {
        where[Op.or] = locationConditions;
      }
      
      // Log the where clause for debugging
      this.logger.log(`Location search where clause: ${JSON.stringify(where)}`);
    }
    
    // If debug mode is enabled, log additional information
    if (debug) {
      // Skip verification status check in debug mode
      if (where.verificationStatus) {
        delete where.verificationStatus;
        this.logger.log('Debug mode: Ignoring verification status filter');
      }
      
      // Log all jobs in the database with their location info
      const allJobs = await this.jobModel.findAll({
        attributes: ['id', 'jobTitle', 'city', 'state', 'country', 'completeAddress', 'latitude', 'longitude', 'status', 'verificationStatus'],
        limit: 20
      });
      
      this.logger.log('Debug mode: All jobs in database:');
      allJobs.forEach(job => {
        this.logger.log(`Job ${job.id}: ${job.jobTitle} - City: ${job.city}, State: ${job.state}, Country: ${job.country}, Address: ${job.completeAddress}, Status: ${job.status}, Verification: ${job.verificationStatus}`);
      });
    }
    
    // For debugging purposes, if verificationStatus is 'approved' but no jobs are found,
    // also include 'pending' jobs
    if (verificationStatus === 'approved') {
      const approvedCount = await this.jobModel.count({ 
        where: { ...where, verificationStatus: 'approved' } 
      });
      
      if (approvedCount === 0) {
        this.logger.log('No approved jobs found, including pending jobs for debugging');
        where.verificationStatus = { [Op.in]: ['approved', 'pending'] };
      } else {
        where.verificationStatus = verificationStatus;
      }
    } else if (verificationStatus) {
      where.verificationStatus = verificationStatus;
    }
    
    // Get total count for pagination (without distance filtering)
    const total = await this.jobModel.count({ where: where });
    
    // Handle sorting
    let orderClause = [['createdAt', 'DESC']]; // Default sorting
    if (sort) {
      const [field, direction] = sort.split(':');
      if (field && (direction === 'asc' || direction === 'desc')) {
        orderClause = [[field, direction.toUpperCase()]];
      }
    }
    
    // Get jobs with pagination
    const options: any = {
      where: where,
      order: orderClause,
      include: [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Company,
          attributes: ['id', 'companyName', 'logoUrl', 'website']
        }
      ]
    };
    
    // Handle coordinate-based search with radius
    if (latitude && longitude) {
      this.logger.log(`Searching jobs within ${radius} miles of coordinates: ${latitude}, ${longitude}`);
      
      // Convert miles to kilometers (1 mile = 1.60934 km)
      const radiusInKm = radius * 1.60934;
      
      // We need to make sure we include all columns from the Job model
      options.attributes = options.attributes || {};
      options.attributes.include = options.attributes.include || [];
      
      // Add distance calculation using Haversine formula with fully qualified column names
      options.attributes.include.push([
        Sequelize.literal(`
          IF(\`Job\`.latitude IS NOT NULL AND \`Job\`.longitude IS NOT NULL,
            (
              6371 * acos(
                least(1.0, cos(radians(${latitude})) 
                * cos(radians(\`Job\`.latitude)) 
                * cos(radians(\`Job\`.longitude) - radians(${longitude})) 
                + sin(radians(${latitude})) 
                * sin(radians(\`Job\`.latitude)))
              )
            ),
            NULL
          )
        `),
        'distance'
      ]);
      
      // Add a raw attribute to help with debugging - use fully qualified column names
      options.attributes.include.push([
        Sequelize.literal(`CONCAT(\`Job\`.latitude, ',', \`Job\`.longitude)`),
        'coordinates'
      ]);
      
      // Log the SQL query for debugging
      options.logging = (sql) => this.logger.log(`SQL Query: ${sql}`);
    }
    
    // Add pagination if provided and valid
    if (limit !== undefined && limit !== null) {
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        options.limit = parsedLimit;
      }
    }
    
    if (offset !== undefined && offset !== null) {
      const parsedOffset = parseInt(offset);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        options.offset = parsedOffset;
      }
    }
    
    let jobs = await this.jobModel.findAll(options);
    
    // If we're doing coordinate-based search, filter by distance in the application
    if (latitude && longitude && jobs.length > 0) {
      const radiusInKm = radius * 1.60934;
      
      this.logger.log(`Found ${jobs.length} jobs before distance filtering`);
      
      // Log all jobs with their distances for debugging
      jobs.forEach(job => {
        const distance = job.get('distance');
        const coords = job.get('coordinates');
        this.logger.log(`Job ${job.id}: distance=${distance}, coordinates=${coords}`);
      });
      
      // Filter jobs by distance
      const filteredJobs = jobs.filter(job => {
        const distance = job.get('distance');
        return distance === null || (distance as number) <= radiusInKm;
      });
      
      this.logger.log(`Found ${filteredJobs.length} jobs after distance filtering`);
      
      // Sort by distance (null distances at the end)
      filteredJobs.sort((a, b) => {
        const distA = a.get('distance') as number | null;
        const distB = b.get('distance') as number | null;
        
        if (distA === null && distB === null) return 0;
        if (distA === null) return 1;
        if (distB === null) return -1;
        return distA - distB;
      });
      
      // Apply limit after filtering
      if (options.limit) {
        jobs = filteredJobs.slice(0, options.limit);
      } else {
        jobs = filteredJobs;
      }
    }
    
    // If currentUserId is provided, check if the user has applied for each job
    if (currentUserId) {
      const jobIds = jobs.map(job => job.id);
      
      // Find all applications by this user for these jobs
      const applications = await this.sequelize.models.JobApplication.findAll({
        where: {
          applicantId: currentUserId,
          jobId: {
            [Op.in]: jobIds
          }
        },
        attributes: ['jobId']
      });
      
      // Find all saved jobs by this user
      const savedJobs = await this.savedJobModel.findAll({
        where: {
          userId: currentUserId,
          jobId: {
            [Op.in]: jobIds
          }
        },
        attributes: ['jobId']
      });
      
      // Create sets of job IDs
      const appliedJobIds = new Set(applications.map(app => app.get('jobId')));
      const savedJobIds = new Set(savedJobs.map(saved => saved.get('jobId')));
      
      // Add properties to each job
      const jobsWithStatus = jobs.map(job => {
        const plainJob = job.get({ plain: true });
        return {
          ...plainJob,
          hasApplied: appliedJobIds.has(job.id),
          isSaved: savedJobIds.has(job.id)
        };
      });
      
      return { jobs: jobsWithStatus, total };
    }
    
    return { jobs, total };
  }

  /**
   * Find one job by ID
   */
  async findOne(id: string, currentUserId?: string): Promise<Job | any> {
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
    
    // If currentUserId is provided, check if the user has applied for this job
    if (currentUserId) {
      // Find application by this user for this job
      const application = await this.sequelize.models.JobApplication.findOne({
        where: {
          applicantId: currentUserId,
          jobId: id
        },
        attributes: ['id']
      });
      
      // Check if job is saved
      const savedJob = await this.savedJobModel.findOne({
        where: {
          userId: currentUserId,
          jobId: id
        },
        attributes: ['id']
      });
      
      console.log('Current user ID:', currentUserId);
      console.log('Job ID:', id);
      console.log('Application found:', !!application);
      console.log('Saved job found:', !!savedJob);
      
      // Convert to plain object and add properties
      const plainJob = job.get({ plain: true });
      const result = {
        ...plainJob,
        hasApplied: !!application,
        isSaved: !!savedJob
      };
      
      console.log('Result with properties:', { hasApplied: result.hasApplied, isSaved: result.isSaved });
      
      return result;
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

  /**
   * Save a job for a user
   */
  async saveJob(userId: string, jobId: string): Promise<SavedJob> {
    // Check if job exists
    const job = await this.jobModel.findByPk(jobId);
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Check if already saved
    const existingSave = await this.savedJobModel.findOne({
      where: { userId, jobId }
    });

    if (existingSave) {
      return existingSave;
    }

    // Create new saved job
    return this.savedJobModel.create({ userId, jobId });
  }

  /**
   * Unsave a job for a user
   */
  async unsaveJob(userId: string, jobId: string): Promise<void> {
    const savedJob = await this.savedJobModel.findOne({
      where: { userId, jobId }
    });

    if (!savedJob) {
      throw new NotFoundException('Saved job not found');
    }

    await savedJob.destroy();
  }

  /**
   * Get all saved jobs for a user
   */
  async getSavedJobs(userId: string, query: any = {}): Promise<{ jobs: Job[], total: number }> {
    const { limit, offset = 0 } = query;

    // Find saved job IDs
    const savedJobs = await this.savedJobModel.findAll({
      where: { userId },
      attributes: ['jobId']
    });

    const jobIds = savedJobs.map(saved => saved.get('jobId'));

    if (jobIds.length === 0) {
      return { jobs: [], total: 0 };
    }

    // Get jobs with pagination
    const whereClause = {
      id: {
        [Op.in]: jobIds
      }
    };

    const total = await this.jobModel.count({ where: whereClause });

    const options: any = {
      where: whereClause,
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
    };

    // Add pagination if provided
    if (limit) {
      options.limit = parseInt(limit);
      options.offset = parseInt(offset);
    }

    const jobs = await this.jobModel.findAll(options);

    // Find all applications by this user for these jobs
    const applications = await this.sequelize.models.JobApplication.findAll({
      where: {
        applicantId: userId,
        jobId: {
          [Op.in]: jobIds
        }
      },
      attributes: ['jobId']
    });

    // Create a set of job IDs that the user has applied for
    const appliedJobIds = new Set(applications.map(app => app.get('jobId')));

    // Add isSaved and hasApplied properties to each job
    const jobsWithStatus = jobs.map(job => {
      const plainJob = job.get({ plain: true });
      return {
        ...plainJob,
        isSaved: true,
        hasApplied: appliedJobIds.has(job.id)
      };
    });

    return { jobs: jobsWithStatus, total };
  }

  /**
   * Get job counts by type
   */
  async getJobCountsByType(): Promise<Record<string, number>> {
    const counts = {};
    
    // Get counts for each job type
    for (const type of Object.values(JobType)) {
      const count = await this.jobModel.count({
        where: {
          jobType: type,
          status: JobStatus.ACTIVE,
          verificationStatus: VerificationStatus.APPROVED
        }
      });
      
      counts[type] = count;
    }
    
    return counts;
  }

  /**
   * Get job listing limits and application statistics for an employer
   */
  async getJobListingLimits(userId: string): Promise<any> {
    // Check if user exists
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Get user's active subscriptions
    const subscriptions = await this.subscriptionService.getUserSubscriptions(userId);
    
    // Get the highest number of jobs allowed from all active subscriptions
    const maxJobs = subscriptions && subscriptions.length > 0 
      ? Math.max(...subscriptions.map(sub => sub.plan.numberOfJobs))
      : 0;
   
    const maxApplications = subscriptions && subscriptions.length > 0 
      ? Math.max(...subscriptions.map(sub => sub.plan.resumeViewsCount))
      : 0;
    // Get current active jobs count
    const activeJobs = await this.jobModel.count({
      where: {
        userId,
        status: {
          [Op.ne]: JobStatus.EXPIRED
        }
      }
    });
    
    // Get today's job posting count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const jobsPostedToday = await this.jobModel.count({
      where: {
        userId,
        createdAt: {
          [Op.gte]: today
        }
      }
    });
    
    // Get application statistics
    const totalApplications = await this.jobModel.sum('applications', {
      where: { userId }
    });
    
    // Get applications received in the last 24 hours
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const applicationsLast24Hours = await this.sequelize.models.JobApplication.count({
      where: {
        createdAt: {
          [Op.gte]: last24Hours
        },
        jobId: {
          [Op.in]: Sequelize.literal(`(SELECT id FROM jobs WHERE userId = '${userId}')`)
        }
      }
    });
    
   
    
    // Get subscription details - removed expiryDate
    const subscriptionDetails = subscriptions && subscriptions.length > 0
      ? subscriptions.map(sub => ({
          id: sub.id,
          planName: sub.plan.name,
          jobsAllowed: sub.plan.numberOfJobs
        }))
      : [];
    
    return {
      jobLimits: {
        maxJobsAllowed: maxJobs,
        activeJobs: activeJobs,
        remainingSlots: Math.max(0, maxJobs - activeJobs),
        jobsPostedToday: jobsPostedToday
      },
      applicationStats: {
        totalApplications: totalApplications || 0,
        applicationsToday: applicationsLast24Hours || 0,
        maxApplications: maxApplications || 0
      },
      subscriptions: subscriptionDetails,
      hasActiveSubscription: subscriptions && subscriptions.length > 0
    };
  }
}