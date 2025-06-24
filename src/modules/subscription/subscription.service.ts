import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { User } from '../user/entities/user.entity';
import { StripeService } from './stripe.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { Op } from 'sequelize';

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

      // Handle zero-price plans or plans with skipStripe flag
      if (plan.price === 0 || !plan.stripeProductId) {
        const startDate = new Date();
        // Create a subscription directly without Stripe integration
        const subscription = await this.subscriptionModel.create({
          userId: user.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          endDate: this.calculateEndDate(startDate, plan.interval, plan.intervalCount || 1),
        }, { transaction });

        await transaction.commit();
        return {
          subscriptionId: subscription.id,
          status: subscription.status,
          planDetails: {
            name: plan.name,
            price: plan.price,
            currency: plan.currency,
            interval: plan.interval
          }
        };
      }
      
      // For paid plans, proceed with Stripe integration
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
   * Confirm a subscription payment
   */
  async confirmSubscription(userId: string, subscriptionId: string, paymentIntentId: string): Promise<Subscription> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the subscription with its plan
      const subscription = await this.subscriptionModel.findOne({
        where: {
          id: subscriptionId,
          userId
        },
        include: [
          {
            model: this.subscriptionPlanModel,
            as: 'plan'
          }
        ],
        transaction
      });
      
      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }
      
      // Verify the payment intent
      const paymentIntent = await this.stripeService.retrievePaymentIntent(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new BadRequestException('Payment has not been completed');
      }
      
      // Get the plan details for calculating the end date
      const plan = subscription.plan;
      
      if (!plan) {
        throw new BadRequestException('Subscription plan not found');
      }
      
      // Update the subscription status
      await subscription.update({
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: this.calculateEndDate(new Date(), plan.interval, plan.intervalCount),
        paymentIntentId: paymentIntent.id,
        lastPaymentDate: new Date()
      }, { transaction });
      
      await transaction.commit();
      
      return this.findSubscriptionById(subscription.id);
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error confirming subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      // If userId is undefined or null, return empty array
      if (!userId) {
        this.logger.warn('Attempted to get subscriptions with undefined userId');
        return [];
      }

      return this.subscriptionModel.findAll({
        where: { 
          userId,
          status: 'active'
        },
        include: [
          {
            model: this.subscriptionPlanModel,
            as: 'plan'
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      this.logger.error(`Error getting user subscriptions: ${error.message}`);
      // Return empty array instead of throwing error
      return [];
    }
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
   * Calculate subscription end date based on start date, interval and count
   */
  private calculateEndDate(startDate: Date, interval: string, count: number = 1): Date {
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
        endDate.setMonth(endDate.getMonth() + count);
    }
    
    return endDate;
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(userId: string, planId: string): Promise<any> {
    try {
      const user = await this.userModel.findByPk(userId);
      const plan = await this.subscriptionPlanModel.findByPk(planId);
      
      if (!plan) {
        throw new NotFoundException('Subscription plan not found');
      }
      
      // Create or get Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await this.stripeService.createCustomer(user.email);
        stripeCustomerId = customer.id;
      }
      
      // Create checkout session
      const session = await this.stripeService.createCheckoutSession(
        stripeCustomerId,
        plan.stripePriceId,
        `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        `${process.env.FRONTEND_URL}/subscription/cancel`
      );
      
      return { sessionId: session.id, url: session.url };
    } catch (error) {
      this.logger.error(`Error creating checkout session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Attach a payment method to customer
   */
  async attachPaymentMethod(userId: string, paymentMethodId: string): Promise<any> {
    try {
      // Find the user
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new NotFoundException('User not found');
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
        await user.update({ stripeCustomerId });
      }
      
      // Attach payment method to customer
      await this.stripeService.attachPaymentMethodToCustomer(
        stripeCustomerId,
        paymentMethodId
      );
      
      // Set as default payment method
      await this.stripeService.updateCustomerDefaultPaymentMethod(
        stripeCustomerId,
        paymentMethodId
      );
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Error attaching payment method: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find active subscriptions by user ID
   */
  async findActiveSubscriptionsByUserId(userId: string): Promise<Subscription[]> {
    return this.subscriptionModel.findAll({
      where: {
        userId,
        status: 'active',
        endDate: {
          [Op.gt]: new Date()
        }
      },
      include: [
        {
          model: this.subscriptionPlanModel,
          as: 'plan'
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Find all subscriptions by user ID (for admin)
   */
  async findAllSubscriptionsByUserId(userId: string): Promise<Subscription[]> {
    return this.subscriptionModel.findAll({
      where: { userId },
      include: [
        {
          model: this.subscriptionPlanModel,
          as: 'plan'
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Find all subscriptions with pagination
   */
  async findAllSubscriptions(page = 1, limit = 10, status?: string): Promise<{ subscriptions: Subscription[]; total: number }> {
    const offset = (page - 1) * limit;
    
    // Build the where clause
    const where: any = {};
    
    // Add status filter if provided
    if (status) {
      where.status = status;
    }
    
    // Find subscriptions with pagination
    const { count, rows } = await this.subscriptionModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.subscriptionPlanModel,
          as: 'plan'
        },
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'userType', 'companyName']
        }
      ]
    });
    
    return {
      subscriptions: rows,
      total: count
    };
  }

  /**
   * Find a subscription by ID with related data
   */
  async findSubscriptionById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionModel.findByPk(id, {
      include: [
        {
          model: this.subscriptionPlanModel,
          as: 'plan'
        },
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'userType', 'companyName']
        }
      ]
    });
    
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    
    return subscription;
  }

  /**
   * Get payment methods for a user
   */
  async getPaymentMethods(userId: string): Promise<any[]> {
    try {
      if (!userId) {
        return [];
      }
      
      // Get the user to check if they have a Stripe customer ID
      const user = await this.userModel.findByPk(userId);
      
      if (!user || !user.stripeCustomerId) {
        return [];
      }
      
      // Get payment methods from Stripe
      const paymentMethods = await this.stripeService.listPaymentMethods(user.stripeCustomerId);
      
      return paymentMethods;
    } catch (error) {
      this.logger.error(`Error getting payment methods: ${error.message}`);
      return [];
    }
  }

  /**
   * Find a subscription by ID with its plan
   */
  async findOne(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionModel.findOne({
      where: { id },
      include: [
        {
          model: this.subscriptionPlanModel,
          as: 'plan'
        }
      ]
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return subscription;
  }

  /**
   * Confirm a free subscription without payment
   */
  async confirmFreeSubscription(userId: string, subscriptionId: string): Promise<Subscription> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the subscription with its plan
      const subscription = await this.findOne(subscriptionId);
      
      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      // Verify this is the user's subscription
      if (subscription.userId !== userId) {
        throw new BadRequestException('This subscription does not belong to the user');
      }

      // Verify this is actually a free plan
      if (!subscription.plan || (subscription.plan.price !== 0 && !subscription.plan.skipStripe)) {
        throw new BadRequestException('This is not a free subscription plan');
      }

      const startDate = new Date();
      
      // Update the subscription status
      await subscription.update({
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate: this.calculateEndDate(startDate, subscription.plan.interval, subscription.plan.intervalCount),
        lastPaymentDate: startDate
      }, { transaction });
      
      await transaction.commit();
      
      return this.findSubscriptionById(subscription.id);
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error confirming free subscription: ${error.message}`);
      throw error;
    }
  }
} 