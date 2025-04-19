import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly templatesDir: string;

  constructor(private configService: ConfigService) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT'),
      secure: this.configService.get('MAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });

    // Set templates directory
    this.templatesDir = path.join(__dirname, '..', '..', '..', 'templates', 'emails');
    
    // Register handlebars helpers
    handlebars.registerHelper('eq', function(a, b) {
      return a === b;
    });
  }

  /**
   * Send an email
   */
  async sendMail(options: {
    to: string;
    subject: string;
    template: string;
    context: any;
  }): Promise<boolean> {
    try {
      // Get template
      const templatePath = path.join(this.templatesDir, `${options.template}.hbs`);
      
      // Check if template exists
      if (!fs.existsSync(templatePath)) {
        this.logger.error(`Email template not found: ${templatePath}`);
        return false;
      }

      // Read template
      const template = fs.readFileSync(templatePath, 'utf8');
      
      // Compile template
      const compiledTemplate = handlebars.compile(template);
      
      // Render template with context
      const html = compiledTemplate(options.context);

      // Send email
      await this.transporter.sendMail({
        from: `"JobTowners" <${this.configService.get('MAIL_FROM')}>`,
        to: options.to,
        subject: options.subject,
        html,
      });

      this.logger.log(`Email sent successfully to: ${options.to}`);
      return true;
    } catch (error) {
      // Log error but don't throw it
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      
      // Check if we're in development mode
      const isDev = this.configService.get('NODE_ENV') === 'development';
      
      if (isDev) {
        // In development, log the email content to console
        this.logger.debug(`Would have sent email to: ${options.to}`);
        this.logger.debug(`Subject: ${options.subject}`);
        this.logger.debug(`Template: ${options.template}`);
        this.logger.debug(`Context: ${JSON.stringify(options.context, null, 2)}`);
      }
      
      // Return false but don't throw error
      return false;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(user: any): Promise<boolean> {
    try {
      const result = await this.sendMail({
        to: user.email,
        subject: 'Welcome to JobTowners!',
        template: 'welcome',
        context: {
          name: user.firstName,
          role: user.role,
          status: user.status,
        },
      });
      return result;
    } catch (error) {
      this.logger.error(`Failed to send welcome email: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send account approval email
   */
  async sendApprovalEmail(user: any): Promise<boolean> {
    try {
      const result = await this.sendMail({
        to: user.email,
        subject: 'Your JobTowners Account Has Been Approved!',
        template: 'account-approved',
        context: {
          name: user.firstName,
          role: user.role,
        },
      });
      return result;
    } catch (error) {
      this.logger.error(`Failed to send approval email: ${error.message}`, error.stack);
      return false;
    }
  }

  async sendTestEmail(to: string): Promise<boolean> {
    return this.transporter.sendMail({
      from: `"JobTowners" <${this.configService.get('MAIL_FROM')}>`,
      to: to,
      subject: 'Test Email',
      text: 'This is a test email. If you received this email, the mail service is working correctly.',
    })
      .then(result => result.accepted.length > 0)
      .catch(error => {
        this.logger.error(`Failed to send test email: ${error.message}`, error.stack);
        return false;
      });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
    return this.transporter.sendMail({
      from: `"JobTowners" <${this.configService.get('MAIL_FROM')}>`,
      to: to,
      subject: 'Password Reset',
      text: `Hello ${name},

You have requested to reset your password. Please click the link below to reset your password:

${this.configService.get('APP_URL')}/reset-password/${token}

If you did not request this, please ignore this email.

Thank you,
JobTowners Team`,
    })
      .then(result => result.accepted.length > 0)
      .catch(error => {
        this.logger.error(`Failed to send password reset email: ${error.message}`, error.stack);
        return false;
      });
  }

  async sendNotificationEmail(to: string, name: string, message: string, actionUrl?: string): Promise<boolean> {
    return this.transporter.sendMail({
      from: `"JobTowners" <${this.configService.get('MAIL_FROM')}>`,
      to: to,
      subject: 'New Notification',
      text: message,
    })
      .then(result => result.accepted.length > 0)
      .catch(error => {
        this.logger.error(`Failed to send notification email: ${error.message}`, error.stack);
        return false;
      });
  }

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(user: any, otpCode: string): Promise<boolean> {
    try {
      const result = await this.sendMail({
        to: user.email,
        subject: 'Verify Your Email - JobTowners',
        template: 'email-verification',
        context: {
          name: user.firstName,
          otpCode,
        },
      });
      return result;
    } catch (error) {
      this.logger.error(`Failed to send OTP email: ${error.message}`, error.stack);
      return false;
    }
  }
} 