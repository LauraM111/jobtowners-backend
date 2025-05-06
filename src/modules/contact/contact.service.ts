import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { ContactFormDto } from './dto/contact.dto';
import { MailgunService } from '../mailgun/mailgun.service';
import { ContactSubmission, ContactSubmissionStatus } from './entities/contact-submission.entity';

@Injectable()
export class ContactService {
  constructor(
    private readonly mailgunService: MailgunService,
    private readonly configService: ConfigService,
    @InjectModel(ContactSubmission)
    private contactSubmissionModel: typeof ContactSubmission,
  ) {}

  async processContactForm(contactFormDto: ContactFormDto) {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    
    // Prepare email content
    const subject = `Contact Form: ${contactFormDto.subject}`;
    const html = this.createEmailTemplate(contactFormDto);
    
    // Send email to admin
    await this.mailgunService.sendEmail({
      to: adminEmail,
      subject,
      html,
      from: `${this.configService.get('MAIL_FROM_NAME')} <${this.configService.get('MAIL_FROM_ADDRESS')}>`,
    });
    
    // Store the submission in the database
    await this.contactSubmissionModel.create({
      name: contactFormDto.name,
      email: contactFormDto.email,
      phoneNumber: contactFormDto.phoneNumber,
      subject: contactFormDto.subject,
      message: contactFormDto.message,
    });
    
    return {
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.',
    };
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