import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { SubscriptionPlan, PlanStatus } from './entities/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { StripeService } from './stripe.service';

@Injectable()
export class SubscriptionPlanService {
  private readonly logger = new Logger(SubscriptionPlanService.name);

  constructor(
    @InjectModel(SubscriptionPlan)
    private subscriptionPlanModel: typeof SubscriptionPlan,
    private stripeService: StripeService,
    private sequelize: Sequelize,
  ) {}

  /**
   * Create a new subscription plan
   */
  async create(createSubscriptionPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Create product in Stripe
      const stripeProduct = await this.stripeService.createProduct(
        createSubscriptionPlanDto.name,
        createSubscriptionPlanDto.description,
      );
      
      // Create price in Stripe
      const stripePrice = await this.stripeService.createPrice(
        stripeProduct.id,
        createSubscriptionPlanDto.price,
        createSubscriptionPlanDto.currency || 'usd',
        createSubscriptionPlanDto.interval,
        createSubscriptionPlanDto.intervalCount || 1,
      );
      
      // Create subscription plan in database
      const subscriptionPlan = await this.subscriptionPlanModel.create({
        ...createSubscriptionPlanDto,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
      }, { transaction });
      
      await transaction.commit();
      return subscriptionPlan;
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error creating subscription plan: ${error.message}`);
      throw new BadRequestException(`Failed to create subscription plan: ${error.message}`);
    }
  }

  /**
   * Find all subscription plans
   */
  async findAll(query: any = {}): Promise<SubscriptionPlan[]> {
    const { status, limit = 10, offset = 0 } = query;
    
    const whereClause: any = {
      deletedAt: null,
    };
    
    if (status) {
      whereClause.status = status;
    }
    
    return this.subscriptionPlanModel.findAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find one subscription plan by ID
   */
  async findOne(id: string): Promise<SubscriptionPlan> {
    const subscriptionPlan = await this.subscriptionPlanModel.findOne({
      where: {
        id,
        deletedAt: null,
      },
    });
    
    if (!subscriptionPlan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }
    
    return subscriptionPlan;
  }

  /**
   * Update a subscription plan
   */
  async update(id: string, updateSubscriptionPlanDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const subscriptionPlan = await this.findOne(id);
      
      // Update product in Stripe if name or description changed
      if (updateSubscriptionPlanDto.name || updateSubscriptionPlanDto.description) {
        await this.stripeService.updateProduct(
          subscriptionPlan.stripeProductId,
          updateSubscriptionPlanDto.name || subscriptionPlan.name,
          updateSubscriptionPlanDto.description || subscriptionPlan.description,
        );
      }
      
      // If price or interval changed, create a new price in Stripe
      if (
        updateSubscriptionPlanDto.price !== undefined ||
        updateSubscriptionPlanDto.interval !== undefined ||
        updateSubscriptionPlanDto.intervalCount !== undefined ||
        updateSubscriptionPlanDto.currency !== undefined
      ) {
        const stripePrice = await this.stripeService.createPrice(
          subscriptionPlan.stripeProductId,
          updateSubscriptionPlanDto.price || subscriptionPlan.price,
          updateSubscriptionPlanDto.currency || subscriptionPlan.currency,
          updateSubscriptionPlanDto.interval || subscriptionPlan.interval,
          updateSubscriptionPlanDto.intervalCount || subscriptionPlan.intervalCount,
        );
        
        // Update the subscription plan with the new price ID
        await subscriptionPlan.update({
          ...updateSubscriptionPlanDto,
          stripePriceId: stripePrice.id
        }, { transaction });
      } else {
        // Update subscription plan in database without changing the price ID
        await subscriptionPlan.update(updateSubscriptionPlanDto, { transaction });
      }
      
      await transaction.commit();
      return this.findOne(id);
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error updating subscription plan: ${error.message}`);
      throw new BadRequestException(`Failed to update subscription plan: ${error.message}`);
    }
  }

  /**
   * Delete a subscription plan (soft delete)
   */
  async remove(id: string): Promise<void> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const subscriptionPlan = await this.findOne(id);
      
      // Archive product in Stripe
      await this.stripeService.archiveProduct(subscriptionPlan.stripeProductId);
      
      // Soft delete subscription plan in database
      await subscriptionPlan.update({
        status: PlanStatus.ARCHIVED,
        deletedAt: new Date(),
      }, { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error deleting subscription plan: ${error.message}`);
      throw new BadRequestException(`Failed to delete subscription plan: ${error.message}`);
    }
  }
} 