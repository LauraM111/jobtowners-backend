import { 
  Controller, Post, Headers, Body, 
  BadRequestException, RawBodyRequest, Req
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

  constructor(
    private configService: ConfigService,
    @InjectModel(Subscription)
    private subscriptionModel: typeof Subscription,
    @InjectModel(User)
    private userModel: typeof User,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-06-20',
    });
  }

  @Public()
  @Post('stripe')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    
    try {
      // Verify the webhook signature
      const event = this.stripe.webhooks.constructEvent(
        req.rawBody, 
        signature, 
        webhookSecret
      );
      
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
          
        // Add more event handlers as needed
      }
      
      return { received: true };
    } catch (error) {
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    // Update subscription status if this was for a subscription
    if (paymentIntent.metadata?.subscriptionId) {
      await this.subscriptionModel.update(
        { status: SubscriptionStatus.ACTIVE },
        { where: { id: paymentIntent.metadata.subscriptionId } }
      );
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    // Update subscription status if this was for a subscription
    if (paymentIntent.metadata?.subscriptionId) {
      await this.subscriptionModel.update(
        { status: SubscriptionStatus.INCOMPLETE_EXPIRED },
        { where: { id: paymentIntent.metadata.subscriptionId } }
      );
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Find and update the subscription in our database
    await this.subscriptionModel.update(
      { 
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date()
      },
      { where: { stripeSubscriptionId: subscription.id } }
    );
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
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
        return; // Unknown status, do nothing
    }
    
    // Update the subscription in our database
    await this.subscriptionModel.update(
      { status },
      { where: { stripeSubscriptionId: subscription.id } }
    );
  }
} 