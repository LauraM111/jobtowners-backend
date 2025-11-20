import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HttpModule } from '@nestjs/axios';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { RecaptchaService } from './recaptcha.service';
import { MailgunModule } from '../mailgun/mailgun.module';
import { ContactSubmission } from './entities/contact-submission.entity';

@Module({
  imports: [
    HttpModule,
    MailgunModule,
    SequelizeModule.forFeature([ContactSubmission]),
  ],
  controllers: [ContactController],
  providers: [ContactService, RecaptchaService],
})
export class ContactModule {} 