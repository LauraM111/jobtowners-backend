import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  BadRequestException,
  RawBodyRequest,
  Req,
  HttpCode,
  Query,
  DefaultValuePipe,
  ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CandidatePaymentService } from './candidate-payment.service';
import { CreateCandidatePlanDto } from './dto/create-candidate-plan.dto';
import { UpdateCandidatePlanDto } from './dto/update-candidate-plan.dto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../user/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';
import { successResponse } from '../../common/helpers/response.helper';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@ApiTags('Candidate Payments')
@Controller('candidate-payments')
export class CandidatePaymentController {
  private stripe: Stripe;

  constructor(
    private readonly candidatePaymentService: CandidatePaymentService,
    private configService: ConfigService
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-04-30.basil',
    });
  }

  @Post('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new candidate plan (Admin only)' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  async createPlan(@Body() createCandidatePlanDto: CreateCandidatePlanDto) {
    try {
      const plan = await this.candidatePaymentService.createPlan(createCandidatePlanDto);
      return successResponse(plan, 'Candidate plan created successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'Get all candidate plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllPlans(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    try {
      const { plans, total } = await this.candidatePaymentService.findAllPlans(page, limit);
      return successResponse(
        { plans, total, page, limit },
        'Candidate plans retrieved successfully'
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get a candidate plan by ID' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  async getPlanById(@Param('id') id: string) {
    try {
      const plan = await this.candidatePaymentService.findPlanById(id);
      return successResponse(plan, 'Candidate plan retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a candidate plan (Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  async updatePlan(
    @Param('id') id: string,
    @Body() updateCandidatePlanDto: UpdateCandidatePlanDto
  ) {
    try {
      const plan = await this.candidatePaymentService.updatePlan(id, updateCandidatePlanDto);
      return successResponse(plan, 'Candidate plan updated successfully');
    } catch (error) {
      // Check if it's a Stripe error related to missing product ID
      if (error.message && error.message.includes('Argument "id" must be a string')) {
        // Try updating without Stripe
        const plan = await this.candidatePaymentService.updatePlanWithoutStripe(id, updateCandidatePlanDto);
        return successResponse(plan, 'Candidate plan updated successfully (without Stripe update)');
      }
      throw new BadRequestException(error.message);
    }
  }

  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a candidate plan (Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  async deletePlan(@Param('id') id: string) {
    try {
      await this.candidatePaymentService.removePlan(id);
      return successResponse(null, 'Candidate plan deleted successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent for a candidate plan or activate free plan' })
  @ApiResponse({ status: 200, description: 'Payment intent created or free plan activated successfully' })
  async createPaymentIntent(
    @Request() req,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto
  ) {
    try {
      // Find the plan first
      const plan = await this.candidatePaymentService.findPlanById(createPaymentIntentDto.planId);
      
      if (!plan) {
        throw new BadRequestException('Plan not found');
      }

      // If it's a free plan (price = 0) or skipStripe is true, activate it immediately
      if (Number(plan.price) === 0 || plan.skipStripe) {
        const result = await this.candidatePaymentService.activateFreePlan(
          req.user.sub,
          createPaymentIntentDto.planId
        );
        return successResponse(
          { 
            clientSecret: null,
            plan,
            order: result.order,
            applicationLimit: result.applicationLimit
          },
          'Free plan activated successfully'
        );
      }

      // For paid plans, proceed with payment intent creation
      const { clientSecret, plan: planDetails } = await this.candidatePaymentService.createPaymentIntent(
        req.user.sub,
        createPaymentIntentDto
      );
      
      return successResponse(
        { clientSecret, plan: planDetails },
        'Payment intent created successfully'
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    console.log('Received candidate payment webhook request');
    
    const signature = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      // Get the raw body as a buffer
      const rawBody = req.rawBody;
      
      if (!rawBody || !signature) {
        console.warn('Missing raw body or signature in candidate payment webhook');
        return { error: 'Missing raw body or signature', received: false };
      }

      // Verify the webhook signature
      const endpointSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      
      if (!endpointSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured for candidate payments');
        return { error: 'Webhook secret not configured', received: false };
      }
      
      event = this.stripe.webhooks.constructEvent(
        rawBody.toString(),
        signature,
        endpointSecret
      );

      console.log(`Processing candidate payment webhook event: ${event.type}`);

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await this.candidatePaymentService.handleSuccessfulPayment(paymentIntent);
          break;
        
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.payment_status === 'paid') {
            await this.candidatePaymentService.handleSuccessfulCheckoutSession(session);
          }
          break;
        
        default:
          console.log(`Unhandled candidate payment event type: ${event.type}`);
          break;
      }

      console.log(`Successfully processed candidate payment webhook event: ${event.type}`);
      return { received: true, eventType: event.type };
    } catch (error) {
      console.error(`Candidate payment webhook error: ${error.message}`, error.stack);
      // Return success even if there's an error to prevent Stripe from retrying
      // Log the error for debugging but don't throw an exception
      return { received: true, error: error.message };
    }
  }

  @Get('payment-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user has paid for job applications' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  async checkPaymentStatus(@Request() req) {
    try {
      const hasPaid = await this.candidatePaymentService.checkUserPaymentStatus(req.user.sub);
      return successResponse({ hasPaid }, 'Payment status retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('application-limit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can apply for a job' })
  @ApiResponse({ status: 200, description: 'Application limit retrieved successfully' })
  async checkApplicationLimit(@Request() req) {
    try {
      const result = await this.candidatePaymentService.checkApplicationLimit(req.user.sub);
      return successResponse(result, 'Application limit retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch('user-limit/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update daily application limit for a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User limit updated successfully' })
  async updateUserLimit(
    @Param('userId') userId: string,
    @Body('dailyLimit') dailyLimit: number
  ) {
    try {
      const limit = await this.candidatePaymentService.updateUserDailyLimit(userId, dailyLimit);
      return successResponse(limit, 'User application limit updated successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('payment-stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment statistics for the current user' })
  @ApiResponse({ status: 200, description: 'Payment statistics retrieved successfully' })
  async getPaymentStats(@Request() req) {
    try {
      // Check if user exists in the request
      const userId = req.user?.sub;
      
      if (!userId) {
        return successResponse({
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
        }, 'No payment stats found');
      }
      
      const stats = await this.candidatePaymentService.getPaymentStats(userId);
      
      return successResponse(stats, 'Payment statistics retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('confirm-payment/:paymentIntentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually confirm a payment (for testing)' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  async confirmPayment(
    @Param('paymentIntentId') paymentIntentId: string,
    @Request() req
  ) {
    try {
      // Retrieve the payment intent from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new BadRequestException('Payment has not succeeded');
      }
      
      // Process the successful payment
      await this.candidatePaymentService.handleSuccessfulPayment(paymentIntent, req.user.sub);
      
      return successResponse(null, 'Payment confirmed successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch('manual-payment-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually update payment status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment status updated successfully' })
  async manuallyUpdatePaymentStatus(
    @Body('userId') userId: string,
    @Body('hasPaid') hasPaid: boolean
  ) {
    try {
      await this.candidatePaymentService.manuallyUpdatePaymentStatus(userId, hasPaid);
      return successResponse(null, 'Payment status updated successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
} 