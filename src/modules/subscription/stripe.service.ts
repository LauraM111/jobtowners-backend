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
    paymentMethodId?: string,
  ): Promise<Stripe.Subscription> {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      };

      // Add payment method if provided
      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      return await this.stripe.subscriptions.create(subscriptionData);
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

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethodToCustomer(customerId: string, paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error) {
      this.logger.error(`Error attaching payment method to customer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update customer's default payment method
   */
  async updateCustomerDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      this.logger.error(`Error updating customer default payment method: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a checkout session
   */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
    } catch (error) {
      this.logger.error(`Error creating checkout session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve a customer from Stripe
   */
  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      this.logger.error(`Error retrieving Stripe customer: ${error.message}`);
      throw error;
    }
  }
} 