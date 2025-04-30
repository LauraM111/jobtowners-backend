import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CandidatePaymentService } from './candidate-payment.service';
import { CandidatePaymentController } from './candidate-payment.controller';
import { CandidatePlan } from './entities/candidate-plan.entity';
import { CandidateOrder } from './entities/candidate-order.entity';
import { ApplicationLimit } from './entities/application-limit.entity';
import { User } from '../user/entities/user.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    SequelizeModule.forFeature([CandidatePlan, CandidateOrder, ApplicationLimit, User]),
    ConfigModule
  ],
  controllers: [CandidatePaymentController],
  providers: [CandidatePaymentService],
  exports: [CandidatePaymentService]
})
export class CandidatePaymentModule {} 