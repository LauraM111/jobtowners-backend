import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { JobApplication } from '../job-application/entities/job-application.entity';
import { ApplicationNotification } from '../job-application/entities/application-notification.entity';
import { Job } from '../job/entities/job.entity';
import { User, UserType } from '../user/entities/user.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ApplicationNotificationService {
  private readonly logger = new Logger(ApplicationNotificationService.name);

  constructor(
    @InjectModel(JobApplication)
    private jobApplicationModel: typeof JobApplication,
    @InjectModel(ApplicationNotification)
    private applicationNotificationModel: typeof ApplicationNotification,
    @InjectModel(Job)
    private jobModel: typeof Job,
    @InjectModel(User)
    private userModel: typeof User,
    private mailService: MailService,
  ) {}

  /**
   * Scheduled job that runs every 2 hours to check for new applications
   * Cron: At minute 0 past every 2nd hour
   */
  @Cron('0 */2 * * *', {
    name: 'check-new-applications',
    timeZone: 'America/Toronto',
  })
  async checkForNewApplications() {
    this.logger.log('Starting scheduled check for new applications...');

    try {
      // Get all employers (users with jobs)
      const employers = await this.getEmployersWithActiveJobs();
      
      this.logger.log(`Found ${employers.length} employers with active jobs`);

      for (const employer of employers) {
        await this.processEmployerNotifications(employer);
      }

      this.logger.log('Completed scheduled check for new applications');
    } catch (error) {
      this.logger.error(`Error in scheduled check for new applications: ${error.message}`, error.stack);
    }
  }

  /**
   * Get all employers who have active jobs
   */
  private async getEmployersWithActiveJobs(): Promise<User[]> {
    // Get all active jobs
    const activeJobs = await this.jobModel.findAll({
      where: {
        status: 'active',
      },
      attributes: ['userId'],
      group: ['userId'],
    });

    const employerIds = activeJobs.map(job => job.userId);

    if (employerIds.length === 0) {
      return [];
    }

    // Get employers
    const employers = await this.userModel.findAll({
      where: {
        id: { [Op.in]: employerIds },
        userType: UserType.EMPLOYER,
        isActive: true,
      },
    });

    return employers;
  }

  /**
   * Process notifications for a specific employer
   */
  private async processEmployerNotifications(employer: User) {
    try {
      // Get or create notification tracking record for this employer
      let notificationRecord = await this.applicationNotificationModel.findOne({
        where: { employerId: employer.id },
      });

      if (!notificationRecord) {
        // Create new record with lastCheckedAt set to 2 hours ago
        // This ensures we don't send notification for very old applications on first run
        notificationRecord = await this.applicationNotificationModel.create({
          employerId: employer.id,
          lastCheckedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          lastNotificationCount: 0,
        });
      }

      // Get all jobs posted by this employer
      const employerJobs = await this.jobModel.findAll({
        where: { userId: employer.id },
        attributes: ['id', 'title', 'jobTitle'],
      });

      if (employerJobs.length === 0) {
        return;
      }

      const jobIds = employerJobs.map(job => job.id);

      // Find new applications since last check
      const newApplications = await this.jobApplicationModel.findAll({
        where: {
          jobId: { [Op.in]: jobIds },
          createdAt: { [Op.gt]: notificationRecord.lastCheckedAt },
        },
        include: [
          {
            model: this.jobModel,
            attributes: ['id', 'title', 'jobTitle'],
          },
        ],
      });

      // If there are no new applications, skip
      if (newApplications.length === 0) {
        this.logger.log(`No new applications for employer: ${employer.email}`);
        return;
      }

      // Group applications by job
      const applicationsByJob = this.groupApplicationsByJob(newApplications);

      // Prepare email data
      const jobs = Object.entries(applicationsByJob).map(([jobId, applications]) => {
        const job = employerJobs.find(j => j.id === jobId);
        return {
          jobTitle: job?.title || job?.jobTitle || 'Unknown Job',
          newApplicants: applications.length,
        };
      });

      const applicationsSummary = {
        totalNewApplicants: newApplications.length,
        jobs,
      };

      // Send email
      const emailSent = await this.mailService.sendNewApplicantsSummaryEmail(
        employer,
        applicationsSummary,
      );

      if (emailSent) {
        // Update notification record
        await notificationRecord.update({
          lastCheckedAt: new Date(),
          lastNotificationCount: newApplications.length,
        });

        this.logger.log(
          `Sent notification to ${employer.email} for ${newApplications.length} new applications`,
        );
      } else {
        this.logger.warn(`Failed to send notification email to ${employer.email}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing notifications for employer ${employer.email}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Group applications by job ID
   */
  private groupApplicationsByJob(applications: JobApplication[]): Record<string, JobApplication[]> {
    return applications.reduce((acc, application) => {
      if (!acc[application.jobId]) {
        acc[application.jobId] = [];
      }
      acc[application.jobId].push(application);
      return acc;
    }, {} as Record<string, JobApplication[]>);
  }

  /**
   * Manual trigger for testing (can be called via API endpoint)
   */
  async triggerNotificationCheckForEmployer(employerId: string): Promise<{ success: boolean; message: string }> {
    try {
      const employer = await this.userModel.findByPk(employerId);
      
      if (!employer) {
        return { success: false, message: 'Employer not found' };
      }

      await this.processEmployerNotifications(employer);
      
      return { success: true, message: 'Notification check completed' };
    } catch (error) {
      this.logger.error(`Error in manual notification trigger: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }
}
