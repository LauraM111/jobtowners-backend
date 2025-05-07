import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanController } from './subscription-plan.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { WebhookController } from './webhook.controller';
import { StripeService } from './stripe.service';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Subscription } from './entities/subscription.entity';
import { User } from '../user/entities/user.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    SequelizeModule.forFeature([SubscriptionPlan, Subscription, User]),
    ConfigModule,
    forwardRef(() => UserModule),
  ],
  controllers: [SubscriptionPlanController, SubscriptionController, WebhookController],
  providers: [SubscriptionPlanService, SubscriptionService, StripeService],
  exports: [SubscriptionPlanService, SubscriptionService, StripeService],
})
export class SubscriptionModule {} 