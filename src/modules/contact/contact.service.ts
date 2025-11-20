import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { ContactFormDto } from './dto/contact.dto';
import { MailgunService } from '../mailgun/mailgun.service';
import { ContactSubmission, ContactSubmissionStatus } from './entities/contact-submission.entity';
import { RecaptchaService } from './recaptcha.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly mailgunService: MailgunService,
    private readonly configService: ConfigService,
    private readonly recaptchaService: RecaptchaService,
    @InjectModel(ContactSubmission)
    private contactSubmissionModel: typeof ContactSubmission,
  ) {}

  async processContactForm(contactFormDto: ContactFormDto) {
    // Verify reCAPTCHA token
    await this.recaptchaService.verifyRecaptcha(contactFormDto.recaptchaToken);
    
    // Sanitize inputs (basic XSS prevention)
    const sanitizedData = this.sanitizeContactData(contactFormDto);
    
    // Additional validation - check for suspicious patterns
    this.validateContactData(sanitizedData);
    
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    
    // Prepare email content
    const subject = `Contact Form: ${sanitizedData.subject}`;
    const html = this.createEmailTemplate(sanitizedData);
    
    // Send email to admin with user's email as Reply-To
    await this.mailgunService.sendEmail({
      to: adminEmail,
      subject,
      html,
      from: `${this.configService.get('MAIL_FROM_NAME')} <${this.configService.get('MAIL_FROM_ADDRESS')}>`,
      replyTo: `${sanitizedData.name} <${sanitizedData.email}>`, // Set Reply-To to user's email
    });
    
    // Store the submission in the database
    await this.contactSubmissionModel.create({
      name: sanitizedData.name,
      email: sanitizedData.email,
      phoneNumber: sanitizedData.phoneNumber,
      subject: sanitizedData.subject,
      message: sanitizedData.message,
    });
    
    return {
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.',
    };
  }

  /**
   * Sanitize contact form data to prevent XSS attacks
   */
  private sanitizeContactData(contactFormDto: ContactFormDto): ContactFormDto {
    const sanitize = (str: string): string => {
      if (!str) return str;
      return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    };

    return {
      name: sanitize(contactFormDto.name),
      email: contactFormDto.email.toLowerCase().trim(),
      phoneNumber: contactFormDto.phoneNumber ? sanitize(contactFormDto.phoneNumber) : undefined,
      subject: sanitize(contactFormDto.subject),
      message: sanitize(contactFormDto.message),
      recaptchaToken: contactFormDto.recaptchaToken,
    };
  }

  /**
   * Validate contact data for suspicious patterns (honeypot check)
   */
  private validateContactData(contactFormDto: ContactFormDto): void {
    // Check for common spam patterns in message
    const spamPatterns = [
      /\b(viagra|cialis|poker|casino|lottery)\b/i,
      /(https?:\/\/.*){5,}/i, // Multiple URLs (5 or more)
      /\b\d{10,}\b/, // Long number sequences (could be spam)
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(contactFormDto.message)) {
        this.logger.warn('Suspicious pattern detected in contact form submission');
        throw new BadRequestException('Your message contains content that appears to be spam.');
      }
    }

    // Check message length
    if (contactFormDto.message.length < 10) {
      throw new BadRequestException('Message is too short. Please provide more details.');
    }

    if (contactFormDto.message.length > 5000) {
      throw new BadRequestException('Message is too long. Please limit your message to 5000 characters.');
    }
  }

  private createEmailTemplate(contactFormDto: ContactFormDto): string {
    return `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${contactFormDto.name}</p>
      <p><strong>Email:</strong> ${contactFormDto.email}</p>
      <p><strong>Phone Number:</strong> ${contactFormDto.phoneNumber || 'Not provided'}</p>
      <p><strong>Subject:</strong> ${contactFormDto.subject}</p>
      <h3>Message:</h3>
      <p>${contactFormDto.message.replace(/\n/g, '<br>')}</p>
    `;
  }

  async getContactSubmissions(page = 1, limit = 10, status?: string) {
    // Convert string parameters to numbers
    const pageNum = parseInt(page as any, 10) || 1;
    const limitNum = parseInt(limit as any, 10) || 10;
    const offset = (pageNum - 1) * limitNum;
    
    const where = status ? { status } : {};
    
    const { count, rows } = await this.contactSubmissionModel.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });
    
    return {
      data: rows,
      meta: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    };
  }

  async getContactSubmissionById(id: string) {
    const submission = await this.contactSubmissionModel.findByPk(id);
    
    if (!submission) {
      throw new NotFoundException(`Contact submission with ID ${id} not found`);
    }
    
    // If the submission is found but hasn't been marked as read, update it
    if (submission.status === ContactSubmissionStatus.NEW) {
      submission.status = ContactSubmissionStatus.READ;
      await submission.save();
    }
    
    return submission;
  }

  async updateContactSubmissionStatus(id: string, status: string) {
    const submission = await this.contactSubmissionModel.findByPk(id);
    
    if (!submission) {
      throw new NotFoundException(`Contact submission with ID ${id} not found`);
    }
    
    // Validate the status
    if (!Object.values(ContactSubmissionStatus).includes(status as any)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    
    // Update the status
    submission.status = status as ContactSubmissionStatus;
    
    // If marking as responded, update the respondedAt timestamp
    if (status === ContactSubmissionStatus.RESPONDED) {
      submission.respondedAt = new Date();
    }
    
    await submission.save();
    
    return {
      success: true,
      message: `Contact submission status updated to ${status}`,
      data: submission
    };
  }

  async respondToContactSubmission(id: string, message: string, userId: string) {
    const submission = await this.contactSubmissionModel.findByPk(id);
    
    if (!submission) {
      throw new NotFoundException(`Contact submission with ID ${id} not found`);
    }
    
    // Send email response to the contact
    await this.mailgunService.sendEmail({
      to: submission.email,
      subject: `Re: ${submission.subject}`,
      html: this.createResponseTemplate(submission, message),
      from: `${this.configService.get('MAIL_FROM_NAME')} <${this.configService.get('MAIL_FROM_ADDRESS')}>`,
      // No need to set replyTo here since the admin wants replies to come back to the business email
    });
    
    // Update submission status
    submission.status = ContactSubmissionStatus.RESPONDED;
    submission.respondedAt = new Date();
    submission.respondedBy = userId;
    await submission.save();
    
    return {
      success: true,
      message: 'Response sent successfully',
      data: submission
    };
  }

  private createResponseTemplate(submission: ContactSubmission, responseMessage: string): string {
    return `
      <h2>Response to Your Inquiry</h2>
      <p>Dear ${submission.name},</p>
      <p>${responseMessage}</p>
      <hr>
      <h3>Your Original Message:</h3>
      <p><strong>Subject:</strong> ${submission.subject}</p>
      <p><strong>Message:</strong></p>
      <p>${submission.message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p>Thank you for contacting us!</p>
      <p>The ${this.configService.get('MAIL_FROM_NAME')} Team</p>
    `;
  }
} 