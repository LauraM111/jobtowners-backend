import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { User } from '../user/entities/user.entity';
import { StripeService } from './stripe.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectModel(Subscription)
    private subscriptionModel: typeof Subscription,
    @InjectModel(SubscriptionPlan)
    private subscriptionPlanModel: typeof SubscriptionPlan,
    @InjectModel(User)
    private userModel: typeof User,
    private stripeService: StripeService,
    private sequelize: Sequelize,
  ) {}

  /**
   * Create a new subscription (initiate payment)
   */
  async create(userId: string, createSubscriptionDto: CreateSubscriptionDto): Promise<any> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the user
      const user = await this.userModel.findByPk(userId, { transaction });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Find the subscription plan
      const plan = await this.subscriptionPlanModel.findOne({
        where: { 
          id: createSubscriptionDto.planId,
          status: 'active',
          deletedAt: null
        },
        transaction
      });
      
      if (!plan) {
        throw new NotFoundException('Subscription plan not found or inactive');
      }
      
      // Check if user already has an active subscription to this plan
      const existingSubscription = await this.subscriptionModel.findOne({
        where: {
          userId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE
        },
        transaction
      });
      
      if (existingSubscription) {
        throw new BadRequestException('You already have an active subscription to this plan');
      }
      
      // Create or get Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      
      if (!stripeCustomerId) {
        const customer = await this.stripeService.createCustomer(
          user.email,
          `${user.firstName} ${user.lastName}`
        );
        stripeCustomerId = customer.id;
        
        // Update user with Stripe customer ID
        try {
          await user.update({ stripeCustomerId }, { transaction });
        } catch (error) {
          // If the column doesn't exist yet, just log the error and continue
          if (error.message && error.message.includes('Unknown column')) {
            this.logger.warn('stripeCustomerId column not found in users table. Skipping update.');
          } else {
            throw error;
          }
        }
      }
      
      // Create payment intent or setup intent in Stripe
      const paymentIntent = await this.stripeService.createPaymentIntent(
        plan.price * 100, // Convert to cents
        plan.currency,
        stripeCustomerId,
        {
          planId: plan.id,
          userId: user.id
        }
      );
      
      // Create a pending subscription
      const subscription = await this.subscriptionModel.create({
        userId: user.id,
        planId: plan.id,
        stripeCustomerId,
        status: SubscriptionStatus.INCOMPLETE,
        startDate: new Date(),
      }, { transaction });
      
      await transaction.commit();
      
      // Return the client secret for the frontend to complete the payment
      return {
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
        planDetails: {
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          interval: plan.interval
        }
      };
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error creating subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Confirm subscription payment
   */
  async confirmSubscription(userId: string, subscriptionId: string, paymentIntentId: string): Promise<Subscription> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the subscription
      const subscription = await this.subscriptionModel.findOne({
        where: { 
          id: subscriptionId,
          userId
        },
        include: [{ model: SubscriptionPlan }],
        transaction
      });
      
      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }
      
      // Verify payment intent status with Stripe
      const paymentIntent = await this.stripeService.retrievePaymentIntent(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new BadRequestException(`Payment not successful. Status: ${paymentIntent.status}`);
      }
      
      // Calculate end date based on plan interval
      const endDate = this.calculateEndDate(
        new Date(),
        subscription.plan.interval,
        subscription.plan.intervalCount
      );
      
      // Create Stripe subscription
      const stripeSubscription = await this.stripeService.createSubscription(
        subscription.stripeCustomerId,
        subscription.plan.stripePriceId
      );
      
      // Update subscription
      await subscription.update({
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: stripeSubscription.id,
        startDate: new Date(),
        endDate
      }, { transaction });
      
      await transaction.commit();
      
      return subscription;
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error confirming subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's active subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionModel.findAll({
      where: { 
        userId,
        status: SubscriptionStatus.ACTIVE
      },
      include: [{ model: SubscriptionPlan }]
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string, subscriptionId: string): Promise<Subscription> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the subscription
      const subscription = await this.subscriptionModel.findOne({
        where: { 
          id: subscriptionId,
          userId,
          status: SubscriptionStatus.ACTIVE
        },
        transaction
      });
      
      if (!subscription) {
        throw new NotFoundException('Active subscription not found');
      }
      
      // Cancel in Stripe if there's a Stripe subscription ID
      if (subscription.stripeSubscriptionId) {
        await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);
      }
      
      // Update subscription
      await subscription.update({
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        cancelAtPeriodEnd: true
      }, { transaction });
      
      await transaction.commit();
      
      return subscription;
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error canceling subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate subscription end date based on interval
   */
  private calculateEndDate(startDate: Date, interval: string, count: number): Date {
    const endDate = new Date(startDate);
    
    switch (interval) {
      case 'day':
        endDate.setDate(endDate.getDate() + count);
        break;
      case 'week':
        endDate.setDate(endDate.getDate() + (count * 7));
        break;
      case 'month':
        endDate.setMonth(endDate.getMonth() + count);
        break;
      case 'year':
        endDate.setFullYear(endDate.getFullYear() + count);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1); // Default to 1 month
    }
    
    return endDate;
  }
} 