import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { MailgunModule } from '../mailgun/mailgun.module';
import { ContactSubmission } from './entities/contact-submission.entity';
import { ContactResponseDto } from './dto/contact-response.dto';

@Module({
  imports: [
    MailgunModule,
    SequelizeModule.forFeature([ContactSubmission]),
  ],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {} 