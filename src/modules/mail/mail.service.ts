import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { User } from '../user/entities/user.entity';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly templatesDir: string;

  constructor(private configService: ConfigService) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAILGUN_SMTP_HOST'),
      port: this.configService.get('MAILGUN_SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('MAILGUN_SMTP_USERNAME'),
        pass: this.configService.get('MAILGUN_SMTP_PASSWORD'),
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
  async sendWelcomeEmail(user: User): Promise<void> {
    const mailOptions = {
      from: `"${this.configService.get('MAIL_FROM_NAME')}" <${this.configService.get('MAIL_FROM_ADDRESS')}>`,
      to: user.email,
      subject: 'Welcome to JobTowners!',
      html: `
        <h1>Welcome to JobTowners, ${user.firstName}!</h1>
        <p>Thank you for registering with us. Your account is currently under review.</p>
        <p>We'll notify you once your account has been approved.</p>
        <p>Best regards,<br>The JobTowners Team</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${user.email}: ${error.message}`);
      throw error;
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

  async sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<void> {
    const mailOptions = {
      from: `"${this.configService.get('MAIL_FROM_NAME')}" <${this.configService.get('MAIL_FROM_ADDRESS')}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h1>Hello ${name},</h1>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>If the link does not work, please copy and paste the following URL into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <p>Best regards,<br>The JobTowners Team</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
      throw error;
    }
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

  /**
   * Send a verification email with a link
   */
  async sendVerificationEmail(email: string, name: string, verificationUrl: string): Promise<void> {
    const mailOptions = {
      from: `"${this.configService.get('MAIL_FROM_NAME')}" <${this.configService.get('MAIL_FROM_ADDRESS')}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <h1>Hello ${name},</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email Address</a></p>
        <p>If the link does not work, please copy and paste the following URL into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, no further action is required.</p>
        <p>Best regards,<br>The JobTowners Team</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send welcome email with simple parameters
   */
  async sendWelcomeEmailSimple(email: string, firstName: string, lastName: string): Promise<void> {
    const mailOptions = {
      from: `"${this.configService.get('MAIL_FROM_NAME')}" <${this.configService.get('MAIL_FROM_ADDRESS')}>`,
      to: email,
      subject: 'Welcome to JobTowners!',
      html: `
        <h1>Welcome to JobTowners, ${firstName}!</h1>
        <p>Thank you for registering with us. Your account is currently under review.</p>
        <p>We'll notify you once your account has been approved.</p>
        <p>Best regards,<br>The JobTowners Team</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}: ${error.message}`);
      throw error;
    }
  }
} 