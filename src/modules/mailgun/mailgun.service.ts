import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as formData from 'form-data';
import Mailgun from 'mailgun.js';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from: string;
  replyTo?: string;
}

@Injectable()
export class MailgunService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAILGUN_SMTP_HOST'),
      port: this.configService.get('MAILGUN_SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('MAILGUN_SMTP_USERNAME'),
        pass: this.configService.get('MAILGUN_SMTP_PASSWORD'),
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<any> {
    try {
      const mailOptions: any = {
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      if (options.replyTo) {
        mailOptions.replyTo = options.replyTo;
      }

      const result = await this.transporter.sendMail(mailOptions);
      
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
} 