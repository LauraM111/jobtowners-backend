import { 
  Controller, Get, Post, Body, Param, Delete, 
  UseGuards, Request, BadRequestException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

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
  @ApiOperation({ summary: 'Confirm subscription payment' })
  @ApiResponse({ status: 200, description: 'Subscription confirmed successfully' })
  async confirmSubscription(
    @Request() req,
    @Param('id') id: string,
    @Body('paymentIntentId') paymentIntentId: string
  ) {
    try {
      const subscription = await this.subscriptionService.confirmSubscription(
        req.user.sub,
        id,
        paymentIntentId
      );
      return successResponse(subscription, 'Subscription confirmed successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('my-subscriptions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s active subscriptions' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  async getUserSubscriptions(@Request() req) {
    const subscriptions = await this.subscriptionService.getUserSubscriptions(req.user.sub);
    return successResponse(subscriptions, 'Subscriptions retrieved successfully');
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
} 