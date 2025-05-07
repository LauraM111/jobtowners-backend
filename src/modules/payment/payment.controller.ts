import { Controller, Get, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from '../subscription/subscription.service';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Payments')
@Controller('payment-methods')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
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