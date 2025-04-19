import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private mailSender: any;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    // Import the mail utility dynamically
    const MailSenderSmtp = require('../../../utils/mail/mailSenderSmtp');
    
    // Create a new instance with config from environment variables
    this.mailSender = new MailSenderSmtp({
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      username: this.configService.get<string>('MAILGUN_SMTP_USERNAME'),
      password: this.configService.get<string>('MAILGUN_SMTP_PASSWORD'),
      fromEmail: this.configService.get<string>('MAIL_FROM_ADDRESS'),
      fromName: this.configService.get<string>('MAIL_FROM_NAME')
    });
    
    this.logger.log('Mail service initialized with SMTP configuration');
  }

  async sendMail(options: any): Promise<boolean> {
    try {
      this.logger.log(`Sending email to: ${options.to}`);
      const result = await this.mailSender.sendMail(options);
      this.logger.log(`Email sent successfully to: ${options.to}`);
      return result.success;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      if (error.status) {
        this.logger.error(`Status: ${error.status}, Details: ${error.details}, Type: ${error.type}`);
      }
      return false;
    }
  }

  async sendTestEmail(to: string): Promise<boolean> {
    return this.mailSender.sendTestEmail(to)
      .then(result => result.success)
      .catch(error => {
        this.logger.error(`Failed to send test email: ${error.message}`, error.stack);
        return false;
      });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    return this.mailSender.sendWelcomeEmail(to, name)
      .then(result => result.success)
      .catch(error => {
        this.logger.error(`Failed to send welcome email: ${error.message}`, error.stack);
        return false;
      });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
    return this.mailSender.sendPasswordResetEmail(to, name, token)
      .then(result => result.success)
      .catch(error => {
        this.logger.error(`Failed to send password reset email: ${error.message}`, error.stack);
        return false;
      });
  }

  async sendNotificationEmail(to: string, name: string, message: string, actionUrl?: string): Promise<boolean> {
    return this.mailSender.sendNotificationEmail(to, name, message, actionUrl)
      .then(result => result.success)
      .catch(error => {
        this.logger.error(`Failed to send notification email: ${error.message}`, error.stack);
        return false;
      });
  }
} 