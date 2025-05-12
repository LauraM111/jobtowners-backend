import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { User, UserType, UserStatus } from '../user/entities/user.entity';
import { CandidateOrder } from '../candidate-payment/entities/candidate-order.entity';
import { Subscription, SubscriptionStatus } from '../subscription/entities/subscription.entity';
import { JobApplication, JobApplicationStatus } from '../job-application/entities/job-application.entity';
import { Job } from '../job/entities/job.entity';
import { Sequelize, Op, fn, col, literal, QueryTypes } from 'sequelize';
import * as moment from 'moment';

// Define interfaces for raw query results
interface RevenueResult {
  total: number;
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(CandidateOrder)
    private candidateOrderModel: typeof CandidateOrder,
    @InjectModel(Subscription)
    private subscriptionModel: typeof Subscription,
    @InjectModel(JobApplication)
    private jobApplicationModel: typeof JobApplication,
    @InjectModel(Job)
    private jobModel: typeof Job,
    @InjectConnection()
    private sequelize: Sequelize
  ) {}

  /**
   * Get dashboard summary statistics
   */
  async getDashboardStats(): Promise<any> {
    try {
      // Get total users count
      const totalUsers = await this.userModel.count();
      
      // Get total active users count
      const activeUsers = await this.userModel.count({
        where: { status: UserStatus.ACTIVE }
      });
      
      // Get total candidates count
      const totalCandidates = await this.userModel.count({
        where: { userType: UserType.CANDIDATE }
      });
      
      // Get total employers count
      const totalEmployers = await this.userModel.count({
        where: { userType: UserType.EMPLOYER }
      });
      
      // Get total revenue from candidate orders
      const candidateOrdersRevenue = await this.candidateOrderModel.sum('amount', {
        where: { status: 'completed' }
      }) || 0;
      
      // Get total revenue from subscriptions (estimated based on plan price)
      const [subscriptionResult] = await this.sequelize.query(
        `SELECT SUM(CAST(sp.price AS DECIMAL(10,2))) as total
         FROM subscriptions s
         JOIN subscription_plans sp ON s.planId = sp.id
         WHERE s.status = 'active'`,
        { 
          type: QueryTypes.SELECT
        }
      );
      
      // Make sure we convert to a number before using toFixed
      const subscriptionRevenue = Number((subscriptionResult as any)?.total || 0);
      
      // Total revenue
      const totalRevenue = Number(candidateOrdersRevenue) + subscriptionRevenue;
      
      // Get total orders count
      const totalOrders = await this.candidateOrderModel.count({
        where: { status: 'completed' }
      });
      
      // Get total subscriptions count
      const totalSubscriptions = await this.subscriptionModel.count({
        where: { status: SubscriptionStatus.ACTIVE }
      });
      
      // Get total job applications count
      const totalJobApplications = await this.jobApplicationModel.count();
      
      // Get total jobs count
      const totalJobs = await this.jobModel.count();
      
      // Calculate growth metrics (comparing to previous month)
      const currentDate = new Date();
      const previousMonthDate = new Date();
      previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
      
      // Users growth
      const newUsersThisMonth = await this.userModel.count({
        where: {
          createdAt: {
            [Op.gte]: moment().startOf('month').toDate()
          }
        }
      });
      
      const newUsersLastMonth = await this.userModel.count({
        where: {
          createdAt: {
            [Op.gte]: moment().subtract(1, 'month').startOf('month').toDate(),
            [Op.lt]: moment().startOf('month').toDate()
          }
        }
      });
      
      const userGrowth = newUsersLastMonth > 0 
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 
        : newUsersThisMonth > 0 ? 100 : 0;
      
      // Revenue growth
      const revenueThisMonth = await this.calculateMonthlyRevenue(
        moment().startOf('month').toDate(),
        moment().endOf('month').toDate()
      );
      
      const revenueLastMonth = await this.calculateMonthlyRevenue(
        moment().subtract(1, 'month').startOf('month').toDate(),
        moment().subtract(1, 'month').endOf('month').toDate()
      );
      
      const revenueGrowth = revenueLastMonth > 0 
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 
        : revenueThisMonth > 0 ? 100 : 0;
      
      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          candidates: totalCandidates,
          employers: totalEmployers,
          growth: userGrowth.toFixed(2)
        },
        revenue: {
          total: totalRevenue.toFixed(2),
          candidateOrders: Number(candidateOrdersRevenue).toFixed(2),
          subscriptions: subscriptionRevenue.toFixed(2),
          growth: revenueGrowth.toFixed(2)
        },
        orders: {
          total: totalOrders,
          subscriptions: totalSubscriptions
        },
        applications: {
          total: totalJobApplications
        },
        jobs: {
          total: totalJobs
        }
      };
    } catch (error) {
      this.logger.error(`Error getting dashboard stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get performance overview data for charts
   */
  async getPerformanceOverview(period: string = 'month'): Promise<any> {
    try {
      let startDate: Date;
      let endDate: Date = new Date();
      let format: string;
      let groupBy: string;
      
      // Set date range based on period
      switch (period) {
        case 'week':
          startDate = moment().subtract(7, 'days').toDate();
          format = 'YYYY-MM-DD';
          groupBy = 'day';
          break;
        case 'month':
          startDate = moment().subtract(30, 'days').toDate();
          format = 'YYYY-MM-DD';
          groupBy = 'day';
          break;
        case 'quarter':
          startDate = moment().subtract(3, 'months').toDate();
          format = 'YYYY-MM';
          groupBy = 'month';
          break;
        case 'year':
          startDate = moment().subtract(12, 'months').toDate();
          format = 'YYYY-MM';
          groupBy = 'month';
          break;
        default:
          startDate = moment().subtract(30, 'days').toDate();
          format = 'YYYY-MM-DD';
          groupBy = 'day';
      }
      
      // Get data for each chart
      const userRegistrations = await this.getUserRegistrationsOverTime(startDate, endDate, groupBy);
      const revenue = await this.getRevenueOverTime(startDate, endDate, groupBy);
      const jobApplications = await this.getJobApplicationsOverTime(startDate, endDate, groupBy);
      const jobsPosted = await this.getJobsPostedOverTime(startDate, endDate, groupBy);
      
      return {
        userRegistrations,
        revenue,
        jobApplications,
        jobsPosted,
        period
      };
    } catch (error) {
      this.logger.error(`Error getting performance overview: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user type distribution for pie chart
   */
  async getUserTypeDistribution(): Promise<any> {
    try {
      const userTypes = await this.userModel.findAll({
        attributes: [
          'userType',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['userType']
      });
      
      return userTypes.map(type => ({
        name: type.userType,
        value: Number(type.get('count'))
      }));
    } catch (error) {
      this.logger.error(`Error getting user type distribution: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get job application status distribution for pie chart
   */
  async getJobApplicationStatusDistribution(): Promise<any> {
    try {
      const statuses = await this.jobApplicationModel.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status']
      });
      
      return statuses.map(status => ({
        name: status.status,
        value: Number(status.get('count'))
      }));
    } catch (error) {
      this.logger.error(`Error getting job application status distribution: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate monthly revenue
   */
  private async calculateMonthlyRevenue(startDate: Date, endDate: Date): Promise<number> {
    try {
      // Get revenue from candidate orders
      const candidateOrdersRevenue = await this.candidateOrderModel.sum('amount', {
        where: { 
          status: 'completed',
          paymentDate: {
            [Op.between]: [startDate, endDate]
          }
        }
      }) || 0;
      
      // Get revenue from subscriptions - Fix: Use raw query instead of literal
      const [subscriptionResult] = await this.sequelize.query(
        `SELECT SUM(CAST(sp.price AS DECIMAL(10,2))) as total
         FROM subscriptions s
         JOIN subscription_plans sp ON s.planId = sp.id
         WHERE s.status = 'active'
         AND s.startDate BETWEEN :startDate AND :endDate`,
        { 
          replacements: { startDate, endDate },
          type: QueryTypes.SELECT
        }
      );
      
      const subscriptionRevenue = (subscriptionResult as any)?.total || 0;
      
      return Number(candidateOrdersRevenue) + Number(subscriptionRevenue);
    } catch (error) {
      this.logger.error(`Error calculating monthly revenue: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get user registrations over time
   */
  private async getUserRegistrationsOverTime(startDate: Date, endDate: Date, groupBy: string): Promise<any[]> {
    try {
      let dateFormat: string;
      let dateGrouping: any;
      
      if (groupBy === 'day') {
        dateFormat = '%Y-%m-%d';
        dateGrouping = literal(`DATE_FORMAT(createdAt, '${dateFormat}')`);
      } else {
        dateFormat = '%Y-%m';
        dateGrouping = literal(`DATE_FORMAT(createdAt, '${dateFormat}')`);
      }
      
      const registrations = await this.userModel.findAll({
        attributes: [
          [dateGrouping, 'date'],
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: ['date'],
        order: [[literal('date'), 'ASC']]
      });
      
      // Fill in missing dates with zero counts
      return this.fillMissingDates(
        registrations.map(r => ({
          date: r.get('date') as string,
          count: Number(r.get('count'))
        })),
        startDate,
        endDate,
        groupBy
      );
    } catch (error) {
      this.logger.error(`Error getting user registrations over time: ${error.message}`);
      return [];
    }
  }

  /**
   * Get revenue over time
   */
  private async getRevenueOverTime(startDate: Date, endDate: Date, groupBy: string): Promise<any[]> {
    try {
      let dateFormat: string;
      
      if (groupBy === 'day') {
        dateFormat = '%Y-%m-%d';
      } else {
        dateFormat = '%Y-%m';
      }
      
      // Use raw query to get revenue data with proper date formatting
      const query = `
        SELECT DATE_FORMAT(paymentDate, '${dateFormat}') as date, 
               SUM(amount) as amount
        FROM candidate_orders
        WHERE status = 'completed'
        AND paymentDate BETWEEN :startDate AND :endDate
        GROUP BY date
        ORDER BY date ASC
      `;
      
      const orderRevenue = await this.sequelize.query(query, {
        replacements: { startDate, endDate },
        type: QueryTypes.SELECT
      });
      
      // Convert to array of objects with proper types
      const revenueData = orderRevenue.map(r => ({
        date: (r as any)['date'] as string,
        amount: Number((r as any)['amount'])
      }));
      
      // Fill in missing dates with zero amounts
      return this.fillMissingDates(
        revenueData,
        startDate,
        endDate,
        groupBy
      );
    } catch (error) {
      this.logger.error(`Error getting revenue over time: ${error.message}`);
      return [];
    }
  }

  /**
   * Get job applications over time
   */
  private async getJobApplicationsOverTime(startDate: Date, endDate: Date, groupBy: string): Promise<any[]> {
    try {
      let dateFormat: string;
      let dateGrouping: any;
      
      if (groupBy === 'day') {
        dateFormat = '%Y-%m-%d';
        dateGrouping = literal(`DATE_FORMAT(createdAt, '${dateFormat}')`);
      } else {
        dateFormat = '%Y-%m';
        dateGrouping = literal(`DATE_FORMAT(createdAt, '${dateFormat}')`);
      }
      
      const applications = await this.jobApplicationModel.findAll({
        attributes: [
          [dateGrouping, 'date'],
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: ['date'],
        order: [[literal('date'), 'ASC']]
      });
      
      // Fill in missing dates with zero counts
      return this.fillMissingDates(
        applications.map(a => ({
          date: a.get('date') as string,
          count: Number(a.get('count'))
        })),
        startDate,
        endDate,
        groupBy
      );
    } catch (error) {
      this.logger.error(`Error getting job applications over time: ${error.message}`);
      return [];
    }
  }

  /**
   * Get jobs posted over time
   */
  private async getJobsPostedOverTime(startDate: Date, endDate: Date, groupBy: string): Promise<any[]> {
    try {
      let dateFormat: string;
      let dateGrouping: any;
      
      if (groupBy === 'day') {
        dateFormat = '%Y-%m-%d';
        dateGrouping = literal(`DATE_FORMAT(createdAt, '${dateFormat}')`);
      } else {
        dateFormat = '%Y-%m';
        dateGrouping = literal(`DATE_FORMAT(createdAt, '${dateFormat}')`);
      }
      
      const jobs = await this.jobModel.findAll({
        attributes: [
          [dateGrouping, 'date'],
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: ['date'],
        order: [[literal('date'), 'ASC']]
      });
      
      // Fill in missing dates with zero counts
      return this.fillMissingDates(
        jobs.map(j => ({
          date: j.get('date') as string,
          count: Number(j.get('count'))
        })),
        startDate,
        endDate,
        groupBy
      );
    } catch (error) {
      this.logger.error(`Error getting jobs posted over time: ${error.message}`);
      return [];
    }
  }

  /**
   * Fill in missing dates in time series data
   */
  private fillMissingDates(
    data: Array<{ date: string, [key: string]: any }>,
    startDate: Date,
    endDate: Date,
    groupBy: string
  ): Array<{ date: string, [key: string]: any }> {
    const result = [];
    const dataMap = new Map();
    
    // Create a map of existing data points
    data.forEach(item => {
      dataMap.set(item.date, item);
    });
    
    // Generate all dates in the range
    let current = moment(startDate);
    const end = moment(endDate);
    
    while (current.isSameOrBefore(end)) {
      const dateKey = groupBy === 'day' 
        ? current.format('YYYY-MM-DD') 
        : current.format('YYYY-MM');
      
      if (dataMap.has(dateKey)) {
        result.push(dataMap.get(dateKey));
      } else {
        // Create a new data point with zero values
        const newPoint: any = { date: dateKey };
        
        // Add all other properties with zero values
        if (data.length > 0) {
          Object.keys(data[0]).forEach(key => {
            if (key !== 'date') {
              newPoint[key] = 0;
            }
          });
        } else {
          // Default to count if no data points exist
          newPoint.count = 0;
        }
        
        result.push(newPoint);
      }
      
      // Increment to next period
      if (groupBy === 'day') {
        current.add(1, 'day');
      } else {
        current.add(1, 'month');
      }
    }
    
    return result;
  }

  /**
   * Get candidate-specific dashboard statistics
   */
  async getCandidateStats(candidateId: string): Promise<any> {
    try {
      // Verify the user is a candidate
      const candidate = await this.userModel.findOne({
        where: { 
          id: candidateId,
          userType: UserType.CANDIDATE
        }
      });
      
      if (!candidate) {
        throw new Error('User not found or not a candidate');
      }
      
      // Get total job applications by this candidate
      const totalApplications = await this.jobApplicationModel.count({
        where: { applicantId: candidateId }
      });
      
      // Get applications by status
      const applicationsByStatus = await this.jobApplicationModel.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        where: { applicantId: candidateId },
        group: ['status']
      });
      
      const statusCounts = {};
      applicationsByStatus.forEach(item => {
        statusCounts[item.status] = Number(item.get('count'));
      });
      
      // Get recent applications
      const recentApplications = await this.jobApplicationModel.findAll({
        where: { applicantId: candidateId },
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: this.jobModel,
            attributes: ['id', 'title', 'companyId', 'jobTitle', 'jobDescription']
          }
        ]
      });
      
      // Get application trend over time (last 30 days)
      const startDate = moment().subtract(30, 'days').toDate();
      const endDate = new Date();
      const applicationTrend = await this.getApplicationTrendForCandidate(
        candidateId, 
        startDate, 
        endDate, 
        'day'
      );
      
      return {
        applications: {
          total: totalApplications,
          byStatus: statusCounts,
          recent: recentApplications.map(app => ({
            id: app.id,
            jobTitle: app.job.title,
            status: app.status,
            appliedAt: app.createdAt,
            company: app.job.companyId,
            jobPosition: app.job.jobTitle,
            description: app.job.jobDescription?.substring(0, 100) + (app.job.jobDescription?.length > 100 ? '...' : '')
          })),
          trend: applicationTrend
        }
      };
    } catch (error) {
      this.logger.error(`Error getting candidate stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get employer-specific dashboard statistics
   */
  async getEmployerStats(employerId: string): Promise<any> {
    try {
      // Verify the user is an employer
      const employer = await this.userModel.findOne({
        where: { 
          id: employerId,
          userType: UserType.EMPLOYER
        }
      });
      
      if (!employer) {
        throw new Error('User not found or not an employer');
      }
      
      // Get all jobs posted by this employer
      const jobs = await this.jobModel.findAll({
        where: { userId: employerId }
      });
      
      const jobIds = jobs.map(job => job.id);
      
      // Get total job postings
      const totalJobs = jobs.length;
      
      // Get total applications received
      const totalApplications = await this.jobApplicationModel.count({
        where: {
          jobId: {
            [Op.in]: jobIds
          }
        }
      });
      
      // Get applications by status
      const applicationsByStatus = await this.jobApplicationModel.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          jobId: {
            [Op.in]: jobIds
          }
        },
        group: ['status']
      });
      
      const statusCounts = {};
      applicationsByStatus.forEach(item => {
        statusCounts[item.status] = Number(item.get('count'));
      });
      
      // Get applications by job
      const applicationsByJob = await this.jobApplicationModel.findAll({
        attributes: [
          'jobId',
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          jobId: {
            [Op.in]: jobIds
          }
        },
        group: ['jobId']
      });
      
      const jobApplicationCounts = {};
      applicationsByJob.forEach(item => {
        jobApplicationCounts[item.jobId] = Number(item.get('count'));
      });
      
      // Get recent applications
      const recentApplications = await this.jobApplicationModel.findAll({
        where: {
          jobId: {
            [Op.in]: jobIds
          }
        },
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: this.jobModel,
            attributes: ['id', 'title']
          },
          {
            model: this.userModel,
            as: 'applicant',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });
      
      // Get application trend over time (last 30 days)
      const startDate = moment().subtract(30, 'days').toDate();
      const endDate = new Date();
      const applicationTrend = await this.getApplicationTrendForEmployer(
        jobIds, 
        startDate, 
        endDate, 
        'day'
      );
      
      return {
        jobs: {
          total: totalJobs,
          list: jobs.map(job => ({
            id: job.id,
            title: job.title,
            applicationCount: jobApplicationCounts[job.id] || 0,
            createdAt: job.createdAt,
            status: job.status
          }))
        },
        applications: {
          total: totalApplications,
          byStatus: statusCounts,
          recent: recentApplications.map(app => ({
            id: app.id,
            jobTitle: app.job.title,
            candidateName: `${app.applicant.firstName} ${app.applicant.lastName}`,
            candidateEmail: app.applicant.email,
            status: app.status,
            appliedAt: app.createdAt
          })),
          trend: applicationTrend
        }
      };
    } catch (error) {
      this.logger.error(`Error getting employer stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get application trend for a specific candidate
   */
  private async getApplicationTrendForCandidate(
    candidateId: string,
    startDate: Date,
    endDate: Date,
    groupBy: string
  ): Promise<any[]> {
    try {
      let dateFormat: string;
      let dateGrouping: any;
      
      if (groupBy === 'day') {
        dateFormat = '%Y-%m-%d';
        dateGrouping = literal(`DATE_FORMAT(createdAt, '${dateFormat}')`);
      } else {
        dateFormat = '%Y-%m';
        dateGrouping = literal(`DATE_FORMAT(createdAt, '${dateFormat}')`);
      }
      
      const applications = await this.jobApplicationModel.findAll({
        attributes: [
          [dateGrouping, 'date'],
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          applicantId: candidateId,
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: ['date'],
        order: [[literal('date'), 'ASC']]
      });
      
      // Fill in missing dates with zero counts
      return this.fillMissingDates(
        applications.map(a => ({
          date: a.get('date') as string,
          count: Number(a.get('count'))
        })),
        startDate,
        endDate,
        groupBy
      );
    } catch (error) {
      this.logger.error(`Error getting application trend for candidate: ${error.message}`);
      return [];
    }
  }

  /**
   * Get application trend for a specific employer's jobs
   */
  private async getApplicationTrendForEmployer(
    jobIds: string[],
    startDate: Date,
    endDate: Date,
    groupBy: string
  ): Promise<any[]> {
    try {
      if (jobIds.length === 0) {
        return this.fillMissingDates([], startDate, endDate, groupBy);
      }
      
      let dateFormat: string;
      let dateGrouping: any;
      
      if (groupBy === 'day') {
        dateFormat = '%Y-%m-%d';
        dateGrouping = literal(`DATE_FORMAT(createdAt, '${dateFormat}')`);
      } else {
        dateFormat = '%Y-%m';
        dateGrouping = literal(`DATE_FORMAT(createdAt, '${dateFormat}')`);
      }
      
      const applications = await this.jobApplicationModel.findAll({
        attributes: [
          [dateGrouping, 'date'],
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          jobId: {
            [Op.in]: jobIds
          },
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: ['date'],
        order: [[literal('date'), 'ASC']]
      });
      
      // Fill in missing dates with zero counts
      return this.fillMissingDates(
        applications.map(a => ({
          date: a.get('date') as string,
          count: Number(a.get('count'))
        })),
        startDate,
        endDate,
        groupBy
      );
    } catch (error) {
      this.logger.error(`Error getting application trend for employer: ${error.message}`);
      return [];
    }
  }
}