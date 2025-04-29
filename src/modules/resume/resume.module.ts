import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';
import { Resume } from './entities/resume.entity';
import { Education } from './entities/education.entity';
import { Experience } from './entities/experience.entity';
import { Attachment } from './entities/attachment.entity';
import { UserModule } from '../user/user.module';
import { User } from '../user/entities/user.entity';
import { Company } from '../company/entities/company.entity';
import { SubscriptionPlan } from '../subscription/entities/subscription-plan.entity';
import { Subscription } from '../subscription/entities/subscription.entity';
import { Job } from '../job/entities/job.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Resume, 
      Education, 
      Experience, 
      Attachment, 
      User,
      Company, 
      SubscriptionPlan, 
      Subscription, 
      Job
    ]),
    forwardRef(() => UserModule),
  ],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {} 