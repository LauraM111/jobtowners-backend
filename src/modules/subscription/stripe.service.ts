import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PlanInterval } from './entities/subscription-plan.entity';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-06-20',
    });
  }

  /**
   * Create a product in Stripe
   */
  async createProduct(name: string, description?: string): Promise<Stripe.Product> {
    try {
      return await this.stripe.products.create({
        name,
        description,
      });
    } catch (error) {
      this.logger.error(`Error creating Stripe product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a price in Stripe
   */
  async createPrice(
    productId: string,
    unitAmount: number,
    currency: string,
    interval: PlanInterval,
    intervalCount: number,
  ): Promise<Stripe.Price> {
    try {
      return await this.stripe.prices.create({
        product: productId,
        unit_amount: Math.round(unitAmount * 100), // Convert to cents
        currency,
        recurring: {
          interval: interval as Stripe.Price.Recurring.Interval,
          interval_count: intervalCount,
        },
      });
    } catch (error) {
      this.logger.error(`Error creating Stripe price: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a product in Stripe
   */
  async updateProduct(productId: string, name: string, description?: string): Promise<Stripe.Product> {
    try {
      return await this.stripe.products.update(productId, {
        name,
        description,
      });
    } catch (error) {
      this.logger.error(`Error updating Stripe product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Archive a product in Stripe
   */
  async archiveProduct(productId: string): Promise<Stripe.Product> {
    try {
      return await this.stripe.products.update(productId, {
        active: false,
      });
    } catch (error) {
      this.logger.error(`Error archiving Stripe product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.create({
        email,
        name,
      });
    } catch (error) {
      this.logger.error(`Error creating Stripe customer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a subscription in Stripe
   */
  async createSubscription(
    customerId: string,
    priceId: string,
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      });
    } catch (error) {
      this.logger.error(`Error creating Stripe subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a subscription in Stripe
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      this.logger.error(`Error canceling Stripe subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a payment intent in Stripe
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    metadata: any = {}
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        metadata,
        payment_method_types: ['card'],
      });
    } catch (error) {
      this.logger.error(`Error creating Stripe payment intent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve a payment intent from Stripe
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error(`Error retrieving Stripe payment intent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a setup intent in Stripe (for saving payment methods)
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      return await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });
    } catch (error) {
      this.logger.error(`Error creating Stripe setup intent: ${error.message}`);
      throw error;
    }
  }
} 