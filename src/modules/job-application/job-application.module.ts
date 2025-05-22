import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JobApplicationController } from './job-application.controller';
import { JobApplicationService } from './job-application.service';
import { JobApplication } from './entities/job-application.entity';
import { JobModule } from '../job/job.module';
import { ResumeModule } from '../resume/resume.module';
import { UserModule } from '../user/user.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { User } from '../user/entities/user.entity';
import { Resume } from '../resume/entities/resume.entity';
import { Job } from '../job/entities/job.entity';
import { CandidatePaymentModule } from '../candidate-payment/candidate-payment.module';
import { Education } from '../resume/entities/education.entity';
import { Experience } from '../resume/entities/experience.entity';
import { Attachment } from '../resume/entities/attachment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([
      JobApplication, 
      User, 
      Resume, 
      Job,
      Education,
      Experience,
      Attachment
    ]),
    JobModule,
    ResumeModule,
    UserModule,
    SubscriptionModule,
    CandidatePaymentModule,
  ],
  controllers: [JobApplicationController],
  providers: [JobApplicationService],
  exports: [JobApplicationService],
})
export class JobApplicationModule {} 