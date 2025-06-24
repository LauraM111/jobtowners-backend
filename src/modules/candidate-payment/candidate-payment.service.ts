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
import { Op } from 'sequelize';

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
      let stripeProductId: string | null = null;
      let stripePriceId: string | null = null;

      // Only create Stripe product and price if price > 0 and skipStripe is not true
      if (createCandidatePlanDto.price > 0 && !createCandidatePlanDto.skipStripe) {
        // Create product in Stripe
        const product = await this.stripe.products.create({
          name: createCandidatePlanDto.name,
          description: createCandidatePlanDto.description || 'Candidate job application plan',
        });
        stripeProductId = product.id;
        
        // Create a one-time price (not recurring)
        const price = await this.stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(createCandidatePlanDto.price * 100), // Convert to cents
          currency: createCandidatePlanDto.currency || 'usd',
        });
        stripePriceId = price.id;
      }
      
      // Create plan in database
      const plan = await this.candidatePlanModel.create({
        ...createCandidatePlanDto,
        stripeProductId,
        stripePriceId,
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
      const existingPlan = await this.findPlanById(id);
      
      // Update Stripe product if we have a product ID
      if (existingPlan.stripeProductId) {
        try {
          await this.stripe.products.update(
            existingPlan.stripeProductId,
            {
              name: updateCandidatePlanDto.name || existingPlan.name,
              description: updateCandidatePlanDto.description || existingPlan.description,
            }
          );
        } catch (error) {
          console.error('Error updating Stripe product:', error);
          // You might want to handle this error differently
        }
      }
      
      // Update Stripe price if we have a price ID
      if (existingPlan.stripePriceId && updateCandidatePlanDto.price) {
        // Note: Stripe doesn't allow updating prices directly
        // You might need to create a new price and update the reference
        // This is just a placeholder for the logic
      }
      
      // Update the plan in your database
      await existingPlan.update(updateCandidatePlanDto, { transaction });
      
      await transaction.commit();
      return existingPlan;
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
   * Create a payment intent for a candidate plan
   */
  async createPaymentIntent(userId: string, createPaymentIntentDto: CreatePaymentIntentDto): Promise<any> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the user
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Find the plan
      const plan = await this.candidatePlanModel.findByPk(createPaymentIntentDto.planId);
      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      // If it's a free plan or skipStripe is true, create order directly without Stripe
      if (plan.price === 0 || plan.skipStripe) {
        const order = await this.candidateOrderModel.create({
          userId: user.id,
          planId: plan.id,
          amount: plan.price,
          currency: plan.currency,
          status: 'completed',
          paymentDate: new Date()
        }, { transaction });

        // Create or update application limit
        await this.updateApplicationLimit(user.id, plan.dailyApplicationLimit, transaction);

        await transaction.commit();
        return { 
          clientSecret: null,
          plan,
          order,
          message: 'Free plan activated successfully'
        };
      }

      // For paid plans, proceed with Stripe integration
      let stripeCustomerId = user.stripeCustomerId;
      
      if (!stripeCustomerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        });
        stripeCustomerId = customer.id;
        
        await user.update({ stripeCustomerId }, { transaction });
      }
      
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(plan.price * 100),
        currency: plan.currency,
        customer: stripeCustomerId,
        metadata: {
          planId: plan.id,
          userId: user.id
        }
      });
      
      // Create pending order
      await this.candidateOrderModel.create({
        userId: user.id,
        planId: plan.id,
        amount: plan.price,
        currency: plan.currency,
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId
      }, { transaction });
      
      await transaction.commit();
      
      return {
        clientSecret: paymentIntent.client_secret,
        plan
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
            dailyLimit: 15, // Default limit
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

      // Find user's active plan to get the dynamic daily limit
      let dailyLimit = 15; // Default limit
      
      // Get the user's active plan if they have one
      const activePlan = await this.candidateOrderModel.findOne({
        where: { 
          userId, 
          status: 'completed'
        },
        order: [['createdAt', 'DESC']],
        include: [{
          model: this.candidatePlanModel,
          as: 'plan'
        }]
      });

      // If user has an active plan, use its daily application limit
      if (activePlan && activePlan.plan) {
        dailyLimit = activePlan.plan.dailyApplicationLimit || 15;
      }

      if (!applicationLimit) {
        // Create default application limit if it doesn't exist
        applicationLimit = await this.applicationLimitModel.create({
          userId,
          dailyLimit: dailyLimit,
          applicationsUsedToday: 0,
          lastResetDate: new Date(),
          hasPaid: !!activePlan // Set hasPaid based on whether user has an active plan
        });
      } else {
        // Update the daily limit based on the user's current plan
        if (applicationLimit.dailyLimit !== dailyLimit || applicationLimit.hasPaid !== !!activePlan) {
          await applicationLimit.update({
            dailyLimit: dailyLimit,
            hasPaid: !!activePlan
          });
        }
      }

      return {
        totalSpent,
        ordersCount: orders.length,
        lastPayment,
        hasPaidPlan: !!activePlan,
        applicationLimit,
        activePlan: activePlan ? {
          id: activePlan.id,
          planName: activePlan.plan ? activePlan.plan.name : null
        } : null
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

  async updatePlanWithoutStripe(id: string, updateCandidatePlanDto: UpdateCandidatePlanDto) {
    // This method updates the plan in your database without touching Stripe
    // Implement according to your database structure
    // For example:
    return this.candidatePlanModel.update(updateCandidatePlanDto, { where: { id } });
  }

  /**
   * Update application limit for a user
   */
  private async updateApplicationLimit(
    userId: string,
    dailyLimit: number,
    transaction: any
  ): Promise<ApplicationLimit> {
    // Get or create application limit for the user
    const [limit, created] = await this.applicationLimitModel.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        dailyLimit,
        applicationsUsedToday: 0,
        lastResetDate: new Date(),
        hasPaid: true
      },
      transaction
    });

    if (!created) {
      // Update existing limit
      await limit.update({
        dailyLimit,
        hasPaid: true,
        // Reset applications if it's a new day
        ...(new Date().toDateString() !== new Date(limit.lastResetDate).toDateString() && {
          applicationsUsedToday: 0,
          lastResetDate: new Date()
        })
      }, { transaction });
    }

    return limit;
  }

  /**
   * Activate a free plan or plan with skipStripe
   */
  async activateFreePlan(userId: string, planId: string): Promise<{ order: CandidateOrder; applicationLimit: ApplicationLimit }> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the user
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Find the plan
      const plan = await this.candidatePlanModel.findByPk(planId);
      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      // Verify this is actually a free plan or skipStripe plan
      if (Number(plan.price) !== 0 && !plan.skipStripe) {
        throw new BadRequestException('This is not a free plan or skipStripe plan');
      }

      // Create completed order
      const order = await this.candidateOrderModel.create({
        userId: user.id,
        planId: plan.id,
        amount: plan.price,
        currency: plan.currency,
        status: 'completed',
        paymentDate: new Date()
      }, { transaction });

      // Update application limit
      const applicationLimit = await this.updateApplicationLimit(
        user.id,
        plan.dailyApplicationLimit,
        transaction
      );

      await transaction.commit();
      return { order, applicationLimit };
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error activating free plan: ${error.message}`);
      throw error;
    }
  }
} 