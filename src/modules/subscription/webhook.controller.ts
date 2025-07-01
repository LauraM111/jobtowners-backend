import { 
  Controller, Post, Headers, Body, 
  BadRequestException, RawBodyRequest, Req, HttpStatus, HttpCode, Logger, Get
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { User } from '../user/entities/user.entity';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import Stripe from 'stripe';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private stripe: Stripe;
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private configService: ConfigService,
    @InjectModel(Subscription)
    private subscriptionModel: typeof Subscription,
    @InjectModel(User)
    private userModel: typeof User,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-04-30.basil',
    });
  }

  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any
  ) {
    this.logger.log('Received Stripe webhook request');
    
    if (!signature) {
      this.logger.warn('Missing stripe-signature header');
      return { error: 'Missing stripe-signature header', received: false };
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET not configured');
      return { error: 'Webhook secret not configured', received: false };
    }
    
    try {
      // Verify the webhook signature
      this.logger.log('Verifying webhook signature');
      const event = this.stripe.webhooks.constructEvent(
        req.rawBody, 
        signature, 
        webhookSecret
      );
      
      this.logger.log(`Processing webhook event: ${event.type}`);
      
      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
          
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
          
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
          
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
          break;
      }
      
      this.logger.log(`Successfully processed webhook event: ${event.type}`);
      return { received: true, eventType: event.type };
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      // Return success even if there's an error to prevent Stripe from retrying
      // Log the error for debugging but don't throw an exception
      return { received: true, error: error.message };
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    try {
      this.logger.log(`Handling payment_intent.succeeded: ${paymentIntent.id}`);
      
      // Update subscription status if this was for a subscription
      if (paymentIntent.metadata?.subscriptionId) {
        const updated = await this.subscriptionModel.update(
          { status: SubscriptionStatus.ACTIVE },
          { where: { id: paymentIntent.metadata.subscriptionId } }
        );
        this.logger.log(`Updated ${updated[0]} subscriptions to ACTIVE`);
      }
    } catch (error) {
      this.logger.error(`Error handling payment_intent.succeeded: ${error.message}`);
      // Don't throw - just log the error
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      this.logger.log(`Handling payment_intent.payment_failed: ${paymentIntent.id}`);
      
      // Update subscription status if this was for a subscription
      if (paymentIntent.metadata?.subscriptionId) {
        const updated = await this.subscriptionModel.update(
          { status: SubscriptionStatus.INCOMPLETE_EXPIRED },
          { where: { id: paymentIntent.metadata.subscriptionId } }
        );
        this.logger.log(`Updated ${updated[0]} subscriptions to INCOMPLETE_EXPIRED`);
      }
    } catch (error) {
      this.logger.error(`Error handling payment_intent.payment_failed: ${error.message}`);
      // Don't throw - just log the error
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    try {
      this.logger.log(`Handling customer.subscription.deleted: ${subscription.id}`);
      
      // Find and update the subscription in our database
      const updated = await this.subscriptionModel.update(
        { 
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date()
        },
        { where: { stripeSubscriptionId: subscription.id } }
      );
      this.logger.log(`Updated ${updated[0]} subscriptions to CANCELED`);
    } catch (error) {
      this.logger.error(`Error handling customer.subscription.deleted: ${error.message}`);
      // Don't throw - just log the error
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
      this.logger.log(`Handling customer.subscription.updated: ${subscription.id}, status: ${subscription.status}`);
      
      // Map Stripe subscription status to our status
      let status: SubscriptionStatus;
      
      switch (subscription.status) {
        case 'active':
          status = SubscriptionStatus.ACTIVE;
          break;
        case 'canceled':
          status = SubscriptionStatus.CANCELED;
          break;
        case 'past_due':
          status = SubscriptionStatus.PAST_DUE;
          break;
        case 'unpaid':
          status = SubscriptionStatus.UNPAID;
          break;
        case 'incomplete':
          status = SubscriptionStatus.INCOMPLETE;
          break;
        case 'incomplete_expired':
          status = SubscriptionStatus.INCOMPLETE_EXPIRED;
          break;
        case 'trialing':
          status = SubscriptionStatus.TRIALING;
          break;
        default:
          this.logger.log(`Unknown subscription status: ${subscription.status}`);
          return; // Unknown status, do nothing
      }
      
      // Update the subscription in our database
      const updated = await this.subscriptionModel.update(
        { status },
        { where: { stripeSubscriptionId: subscription.id } }
      );
      this.logger.log(`Updated ${updated[0]} subscriptions to ${status}`);
    } catch (error) {
      this.logger.error(`Error handling customer.subscription.updated: ${error.message}`);
      // Don't throw - just log the error
    }
  }

  @Public()
  @Get('stripe/test')
  @ApiOperation({ summary: 'Test webhook endpoint accessibility' })
  async testWebhook() {
    this.logger.log('Webhook test endpoint accessed');
    return { 
      status: 'ok', 
      message: 'Webhook endpoint is accessible',
      timestamp: new Date().toISOString()
    };
  }
} 