import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ConfigService } from '@nestjs/config';
import { CandidatePlan } from './entities/candidate-plan.entity';
import { CandidateOrder } from './entities/candidate-order.entity';
import { ApplicationLimit } from './entities/application-limit.entity';
import { CreateCandidatePlanDto } from './dto/create-candidate-plan.dto';
import { UpdateCandidatePlanDto } from './dto/update-candidate-plan.dto';
import { User } from '../user/entities/user.entity';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@Injectable()
export class CandidatePaymentService {
  private readonly logger = new Logger(CandidatePaymentService.name);
  private stripe: Stripe;

  constructor(
    @InjectModel(CandidatePlan)
    private candidatePlanModel: typeof CandidatePlan,
    @InjectModel(CandidateOrder)
    private candidateOrderModel: typeof CandidateOrder,
    @InjectModel(ApplicationLimit)
    private applicationLimitModel: typeof ApplicationLimit,
    @InjectModel(User)
    private userModel: typeof User,
    private configService: ConfigService,
    private sequelize: Sequelize,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-04-30.basil',
    });
  }

  /**
   * Create a new candidate plan
   */
  async createPlan(createCandidatePlanDto: CreateCandidatePlanDto): Promise<CandidatePlan> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Create Stripe product and price
      const product = await this.stripe.products.create({
        name: createCandidatePlanDto.name,
        description: createCandidatePlanDto.description || 'Candidate job application plan',
      });
      
      // Create a one-time price (not recurring)
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(createCandidatePlanDto.price * 100), // Convert to cents
        currency: createCandidatePlanDto.currency || 'usd',
      });
      
      // Create plan in database
      const plan = await this.candidatePlanModel.create({
        name: createCandidatePlanDto.name,
        description: createCandidatePlanDto.description,
        price: createCandidatePlanDto.price,
        currency: createCandidatePlanDto.currency || 'usd',
        dailyApplicationLimit: createCandidatePlanDto.dailyApplicationLimit,
        stripeProductId: product.id,
        stripePriceId: price.id,
        status: 'active',
      }, { transaction });
      
      await transaction.commit();
      return plan;
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error creating candidate plan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all candidate plans with pagination
   */
  async findAllPlans(page = 1, limit = 10): Promise<{ plans: CandidatePlan[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await this.candidatePlanModel.findAndCountAll({
      where: { status: 'active' },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    
    return {
      plans: rows,
      total: count,
    };
  }

  /**
   * Find a candidate plan by ID
   */
  async findPlanById(id: string): Promise<CandidatePlan> {
    const plan = await this.candidatePlanModel.findByPk(id);
    
    if (!plan) {
      throw new NotFoundException(`Candidate plan with ID ${id} not found`);
    }
    
    return plan;
  }

  /**
   * Update a candidate plan
   */
  async updatePlan(id: string, updateCandidatePlanDto: UpdateCandidatePlanDto): Promise<CandidatePlan> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const plan = await this.candidatePlanModel.findByPk(id, { transaction });
      
      if (!plan) {
        throw new NotFoundException(`Candidate plan with ID ${id} not found`);
      }
      
      // Update Stripe product if name or description changed
      if (updateCandidatePlanDto.name || updateCandidatePlanDto.description) {
        await this.stripe.products.update(plan.stripeProductId, {
          name: updateCandidatePlanDto.name || plan.name,
          description: updateCandidatePlanDto.description || plan.description,
        });
      }
      
      // If price changed, create a new price in Stripe
      if (updateCandidatePlanDto.price || updateCandidatePlanDto.currency) {
        const newPrice = await this.stripe.prices.create({
          product: plan.stripeProductId,
          unit_amount: Math.round((updateCandidatePlanDto.price || plan.price) * 100),
          currency: updateCandidatePlanDto.currency || plan.currency,
        });
        
        // Archive the old price
        if (plan.stripePriceId) {
          await this.stripe.prices.update(plan.stripePriceId, { active: false });
        }
        
        // Update the price ID in the plan
        updateCandidatePlanDto.stripePriceId = newPrice.id;
      }
      
      // Update plan in database
      await plan.update(updateCandidatePlanDto, { transaction });
      
      await transaction.commit();
      return plan;
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error updating candidate plan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove a candidate plan (soft delete)
   */
  async removePlan(id: string): Promise<void> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const plan = await this.candidatePlanModel.findByPk(id, { transaction });
      
      if (!plan) {
        throw new NotFoundException(`Candidate plan with ID ${id} not found`);
      }
      
      // Archive the Stripe product
      await this.stripe.products.update(plan.stripeProductId, { active: false });
      
      // Archive the Stripe price
      if (plan.stripePriceId) {
        await this.stripe.prices.update(plan.stripePriceId, { active: false });
      }
      
      // Soft delete the plan
      await plan.update({ status: 'inactive' }, { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error removing candidate plan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a payment intent for a plan
   */
  async createPaymentIntent(userId: string, createPaymentIntentDto: CreatePaymentIntentDto): Promise<any> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Get the plan
      const plan = await this.candidatePlanModel.findByPk(createPaymentIntentDto.planId, { transaction });
      
      if (!plan) {
        throw new NotFoundException(`Candidate plan with ID ${createPaymentIntentDto.planId} not found`);
      }
      
      // Get the user
      const user = await this.userModel.findByPk(userId, { transaction });
      
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      
      // Check if user already has a pending order for this plan
      const pendingOrder = await this.candidateOrderModel.findOne({
        where: {
          userId,
          planId: plan.id,
          status: 'pending'
        },
        transaction
      });
      
      // If there's a pending order with a payment intent, return that
      if (pendingOrder && pendingOrder.stripePaymentIntentId) {
        try {
          const existingIntent = await this.stripe.paymentIntents.retrieve(pendingOrder.stripePaymentIntentId);
          
          // If the intent is still valid and not succeeded, return it
          if (existingIntent.status !== 'succeeded' && existingIntent.status !== 'canceled') {
            await transaction.commit();
            return {
              clientSecret: existingIntent.client_secret,
              plan: {
                id: plan.id,
                name: plan.name,
                description: plan.description,
                price: plan.price,
                currency: plan.currency
              }
            };
          }
        } catch (error) {
          // If the intent doesn't exist anymore, continue to create a new one
          this.logger.warn(`Error retrieving existing payment intent: ${error.message}`);
        }
      }
      
      // Create a customer if the user doesn't have one
      let customerId = user.get('stripeCustomerId');
      
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.get('email'),
          name: `${user.get('firstName')} ${user.get('lastName')}`,
          metadata: {
            userId: user.id
          }
        });
        
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await user.update({ stripeCustomerId: customerId }, { transaction });
      }
      
      // Create a payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(plan.price * 100), // Convert to cents
        currency: plan.currency,
        customer: customerId,
        metadata: {
          userId: userId,
          planId: plan.id
        }
      });
      
      // Create or update order
      if (pendingOrder) {
        await pendingOrder.update({
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: customerId
        }, { transaction });
      } else {
        await this.candidateOrderModel.create({
          userId,
          planId: plan.id,
          amount: plan.price,
          currency: plan.currency,
          status: 'pending',
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: customerId
        }, { transaction });
      }
      
      await transaction.commit();
      
      return {
        clientSecret: paymentIntent.client_secret,
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          currency: plan.currency
        }
      };
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error creating payment intent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event: any): Promise<void> {
    const transaction = await this.sequelize.transaction();
    
    try {
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        
        // Find order by payment intent ID
        const order = await this.candidateOrderModel.findOne({
          where: { stripePaymentIntentId: paymentIntent.id },
          transaction
        });
        
        if (order) {
          // Update order status
          await order.update({
            status: 'completed',
            paymentDate: new Date()
          }, { transaction });
          
          // Get or create application limit for user
          const [limit, created] = await this.applicationLimitModel.findOrCreate({
            where: { userId: order.userId },
            defaults: {
              userId: order.userId,
              dailyLimit: 15,
              applicationsUsedToday: 0,
              lastResetDate: new Date(),
              hasPaid: true
            },
            transaction
          });
          
          if (!created) {
            // Update existing limit
            await limit.update({
              hasPaid: true
            }, { transaction });
          }
        }
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error handling Stripe webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if user has paid for job applications
   */
  async checkUserPaymentStatus(userId: string): Promise<boolean> {
    const limit = await this.applicationLimitModel.findOne({
      where: { userId }
    });
    
    return limit ? limit.hasPaid : false;
  }

  /**
   * Check if user can apply for a job
   */
  async checkApplicationLimit(userId: string): Promise<{ canApply: boolean, remainingApplications: number }> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Get or create application limit for user
      const [limit, created] = await this.applicationLimitModel.findOrCreate({
        where: { userId },
        defaults: {
          userId,
          dailyLimit: 15,
          applicationsUsedToday: 0,
          lastResetDate: new Date(),
          hasPaid: false
        },
        transaction
      });
      
      // Check if user has paid
      if (!limit.hasPaid) {
        await transaction.commit();
        return { canApply: false, remainingApplications: 0 };
      }
      
      // Check if limit needs to be reset (new day)
      const today = new Date();
      const lastResetDate = new Date(limit.lastResetDate);
      
      if (today.toDateString() !== lastResetDate.toDateString()) {
        // Reset daily count
        await limit.update({
          applicationsUsedToday: 0,
          lastResetDate: today
        }, { transaction });
        
        await transaction.commit();
        return { canApply: true, remainingApplications: limit.dailyLimit };
      }
      
      // Check if user has reached daily limit
      const canApply = limit.applicationsUsedToday < limit.dailyLimit;
      const remainingApplications = limit.dailyLimit - limit.applicationsUsedToday;
      
      await transaction.commit();
      return { canApply, remainingApplications };
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error checking application limit: ${error.message}`);
      throw error;
    }
  }

  /**
   * Increment application count for user
   */
  async incrementApplicationCount(userId: string): Promise<void> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const limit = await this.applicationLimitModel.findOne({
        where: { userId },
        transaction
      });
      
      if (!limit) {
        throw new NotFoundException('Application limit not found for user');
      }
      
      // Increment count
      await limit.increment('applicationsUsedToday', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error incrementing application count: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update daily application limit for a user
   */
  async updateUserDailyLimit(userId: string, dailyLimit: number): Promise<ApplicationLimit> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const limit = await this.applicationLimitModel.findOne({
        where: { userId },
        transaction
      });
      
      if (!limit) {
        throw new NotFoundException('Application limit not found for user');
      }
      
      // Update daily limit
      await limit.update({ dailyLimit }, { transaction });
      
      await transaction.commit();
      return limit;
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error updating user daily limit: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user payment and application statistics
   */
  async getUserPaymentStats(userId: string): Promise<any> {
    // Get application limit
    const limit = await this.applicationLimitModel.findOne({
      where: { userId }
    });
    
    // Get completed orders
    const orders = await this.candidateOrderModel.findAll({
      where: { userId, status: 'completed' },
      include: [{ model: CandidatePlan }],
      order: [['paymentDate', 'DESC']]
    });
    
    return {
      hasPaid: limit ? limit.hasPaid : false,
      dailyLimit: limit ? limit.dailyLimit : 15,
      applicationsUsedToday: limit ? limit.applicationsUsedToday : 0,
      remainingApplications: limit ? (limit.dailyLimit - limit.applicationsUsedToday) : 0,
      lastResetDate: limit ? limit.lastResetDate : null,
      paymentHistory: orders.map(order => ({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentDate: order.paymentDate,
        planName: order.plan ? order.plan.name : 'Unknown Plan'
      }))
    };
  }

  /**
   * Handle successful payment from webhook
   */
  async handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent, userId?: string): Promise<void> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the order by payment intent ID
      const order = await this.candidateOrderModel.findOne({
        where: { stripePaymentIntentId: paymentIntent.id },
        transaction
      });
      
      if (!order) {
        this.logger.warn(`No order found for payment intent ${paymentIntent.id}`);
        await transaction.rollback();
        return;
      }
      
      // If userId is provided, verify it matches the order
      if (userId && order.userId !== userId) {
        this.logger.warn(`User ID mismatch for payment intent ${paymentIntent.id}`);
        await transaction.rollback();
        return;
      }
      
      // Update order status
      await order.update({
        status: 'completed',
        paymentDate: new Date()
      }, { transaction });
      
      // Get or create application limit for the user
      let limit = await this.applicationLimitModel.findOne({
        where: { userId: order.userId },
        transaction
      });
      
      if (!limit) {
        // Get the plan to get the daily limit
        const plan = await this.candidatePlanModel.findByPk(order.planId, { transaction });
        
        if (!plan) {
          throw new Error(`Plan with ID ${order.planId} not found`);
        }
        
        // Create application limit
        limit = await this.applicationLimitModel.create({
          userId: order.userId,
          dailyLimit: plan.dailyApplicationLimit,
          applicationsUsedToday: 0,
          lastResetDate: new Date(),
          hasPaid: true
        }, { transaction });
      } else {
        // Update existing limit
        await limit.update({
          hasPaid: true
        }, { transaction });
      }
      
      await transaction.commit();
      this.logger.log(`Payment for order ${order.id} processed successfully`);
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error processing payment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle successful checkout session
   */
  async handleSuccessfulCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
    // If using Checkout Sessions instead of Payment Intents
    if (session.payment_intent) {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(session.payment_intent as string);
      await this.handleSuccessfulPayment(paymentIntent);
    }
  }

  /**
   * Manually update payment status for a user
   */
  async manuallyUpdatePaymentStatus(userId: string, hasPaid: boolean): Promise<void> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Get or create application limit for the user
      let limit = await this.applicationLimitModel.findOne({
        where: { userId },
        transaction
      });
      
      if (!limit) {
        // Create application limit with default values
        limit = await this.applicationLimitModel.create({
          userId,
          dailyLimit: 15,
          applicationsUsedToday: 0,
          lastResetDate: new Date(),
          hasPaid
        }, { transaction });
      } else {
        // Update existing limit
        await limit.update({
          hasPaid
        }, { transaction });
      }
      
      await transaction.commit();
      this.logger.log(`Payment status for user ${userId} manually updated to ${hasPaid}`);
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error updating payment status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all orders with pagination
   */
  async findAllOrders(page = 1, limit = 10, status?: string): Promise<{ rows: CandidateOrder[]; count: number }> {
    const offset = (page - 1) * limit;
    
    // Build the where clause
    const where: any = {};
    
    // Add status filter if provided
    if (status) {
      where.status = status;
    }
    
    // Find orders with pagination
    return this.candidateOrderModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.candidatePlanModel,
          as: 'plan'
        },
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'userType']
        }
      ]
    });
  }

  /**
   * Find an order by ID with related data
   */
  async findOrderById(id: string): Promise<CandidateOrder> {
    const order = await this.candidateOrderModel.findByPk(id, {
      include: [
        {
          model: this.candidatePlanModel,
          as: 'plan'
        },
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'userType']
        }
      ]
    });
    
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    return order;
  }

  /**
   * Get payment statistics for a user
   */
  async getPaymentStats(userId: string): Promise<any> {
    try {
      // If userId is undefined or null, return empty stats
      if (!userId) {
        this.logger.warn('Attempted to get payment stats with undefined userId');
        return {
          totalSpent: 0,
          ordersCount: 0,
          lastPayment: null,
          hasPaidPlan: false,
          applicationLimit: {
            dailyLimit: 15,
            applicationsUsedToday: 0,
            lastResetDate: new Date(),
            hasPaid: false
          }
        };
      }

      // Get all orders for the user
      const orders = await this.candidateOrderModel.findAll({
        where: { userId, status: 'completed' }
      });

      // Calculate total spent
      const totalSpent = orders.reduce((sum, order) => sum + Number(order.amount), 0);

      // Get the last payment date
      const lastPayment = orders.length > 0 
        ? orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
        : null;

      // Get application limit
      let applicationLimit = await this.applicationLimitModel.findOne({
        where: { userId }
      });

      if (!applicationLimit) {
        // Create default application limit if it doesn't exist
        applicationLimit = await this.applicationLimitModel.create({
          userId,
          dailyLimit: 15,
          applicationsUsedToday: 0,
          lastResetDate: new Date(),
          hasPaid: false
        });
      }

      return {
        totalSpent,
        ordersCount: orders.length,
        lastPayment,
        hasPaidPlan: applicationLimit.hasPaid,
        applicationLimit
      };
    } catch (error) {
      this.logger.error(`Error getting payment stats: ${error.message}`);
      // Return default stats instead of throwing error
      return {
        totalSpent: 0,
        ordersCount: 0,
        lastPayment: null,
        hasPaidPlan: false,
        applicationLimit: {
          dailyLimit: 15,
          applicationsUsedToday: 0,
          lastResetDate: new Date(),
          hasPaid: false
        }
      };
    }
  }
} 