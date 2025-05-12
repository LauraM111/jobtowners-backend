import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { UserModule } from '../user/user.module';
import { CandidatePaymentModule } from '../candidate-payment/candidate-payment.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { JobApplicationModule } from '../job-application/job-application.module';
import { JobModule } from '../job/job.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from '../user/entities/user.entity';
import { CandidateOrder } from '../candidate-payment/entities/candidate-order.entity';
import { Subscription } from '../subscription/entities/subscription.entity';
import { JobApplication } from '../job-application/entities/job-application.entity';
import { Job } from '../job/entities/job.entity';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      CandidateOrder,
      Subscription,
      JobApplication,
      Job
    ]),
    UserModule,
    CandidatePaymentModule,
    SubscriptionModule,
    JobApplicationModule,
    JobModule,
    CommonModule
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService]
})
export class StatsModule {} 