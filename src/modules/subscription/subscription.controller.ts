import { 
  Controller, Get, Post, Body, Param, Delete, 
  UseGuards, Request, BadRequestException, Inject, forwardRef 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { successResponse } from '../../common/helpers/response.helper';
import { UserService } from '../user/user.service';
import { Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    private readonly stripe: StripeService
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new subscription (initiate payment)' })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
  async create(@Request() req, @Body() createSubscriptionDto: CreateSubscriptionDto) {
    try {
      const result = await this.subscriptionService.create(req.user.sub, createSubscriptionDto);
      return successResponse(result, 'Payment intent created successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post(':id/confirm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm subscription payment or activate free plan' })
  @ApiResponse({ status: 200, description: 'Subscription confirmed/activated successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentIntentId: {
          type: 'string',
          description: 'Required for paid plans, not required for free plans'
        }
      },
      required: []
    }
  })
  async confirmSubscription(
    @Request() req,
    @Param('id') id: string,
    @Body('paymentIntentId') paymentIntentId?: string
  ) {
    try {
      // First check if this is a free plan subscription
      const subscription = await this.subscriptionService.findOne(id);
      
      if (!subscription) {
        throw new BadRequestException('Subscription not found');
      }

      // If it's a free plan or skipStripe is true, confirm without payment
      if (subscription.plan?.price === 0 || subscription.plan?.skipStripe) {
        const confirmedSubscription = await this.subscriptionService.confirmFreeSubscription(
          req.user.sub,
          id
        );
        return successResponse(confirmedSubscription, 'Free subscription activated successfully');
      }

      // For paid plans, require paymentIntentId
      if (!paymentIntentId) {
        throw new BadRequestException('Payment intent ID is required for paid subscriptions');
      }

      // Proceed with paid subscription confirmation
      const confirmedSubscription = await this.subscriptionService.confirmSubscription(
        req.user.sub,
        id,
        paymentIntentId
      );
      return successResponse(confirmedSubscription, 'Subscription confirmed successfully');
    } catch (error) {
      this.logger.error(`Error confirming subscription: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  @Get('my-subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all subscriptions for the current user' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  async getUserSubscriptions(@Request() req) {
    try {
      // Check if user exists in the request
      const userId = req.user?.sub;
      
      // Even if userId is undefined, we'll pass it to the service
      // The service will handle the undefined case
      const subscriptions = await this.subscriptionService.getUserSubscriptions(userId);
      
      return successResponse(subscriptions, 'Subscriptions retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription canceled successfully' })
  async cancelSubscription(@Request() req, @Param('id') id: string) {
    try {
      const subscription = await this.subscriptionService.cancelSubscription(req.user.sub, id);
      return successResponse(subscription, 'Subscription canceled successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('attach-payment-method')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach a payment method to customer' })
  @ApiResponse({ status: 200, description: 'Payment method attached successfully' })
  async attachPaymentMethod(
    @Request() req,
    @Body() data: { paymentMethodId: string }
  ) {
    try {
      const result = await this.subscriptionService.attachPaymentMethod(
        req.user.sub,
        data.paymentMethodId
      );
      return successResponse(result, 'Payment method attached successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment methods for the current user' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  async getPaymentMethods(@Request() req) {
    try {
      // Check if user exists in the request
      const userId = req.user?.sub;
      
      if (!userId) {
        return successResponse([], 'No payment methods found');
      }
      
      // Use the subscription service to get payment methods
      const paymentMethods = await this.subscriptionService.getPaymentMethods(userId);
      
      return successResponse(paymentMethods, 'Payment methods retrieved successfully');
    } catch (error) {
      this.logger.error(`Error getting payment methods: ${error.message}`);
      return successResponse([], 'Error retrieving payment methods');
    }
  }
} 