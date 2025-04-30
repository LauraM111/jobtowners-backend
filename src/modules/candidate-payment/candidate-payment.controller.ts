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
  HttpCode
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
      apiVersion: '2024-06-20',
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
  @ApiOperation({ summary: 'Get all candidate plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async findAllPlans() {
    try {
      const plans = await this.candidatePaymentService.findAllPlans();
      return successResponse(plans, 'Candidate plans retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get a candidate plan by ID' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  async findPlanById(@Param('id') id: string) {
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
      throw new BadRequestException(error.message);
    }
  }

  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a candidate plan (Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  async removePlan(@Param('id') id: string) {
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
  @ApiOperation({ summary: 'Create a payment intent for a candidate plan' })
  @ApiResponse({ status: 200, description: 'Payment intent created successfully' })
  async createPaymentIntent(
    @Request() req,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto
  ) {
    try {
      const { clientSecret, plan } = await this.candidatePaymentService.createPaymentIntent(
        req.user.sub,
        createPaymentIntentDto
      );
      
      return successResponse(
        { clientSecret, plan },
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
    const signature = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      // Get the raw body as a buffer
      const rawBody = req.rawBody;
      
      if (!rawBody || !signature) {
        throw new BadRequestException('Missing raw body or signature');
      }

      // Verify the webhook signature
      const endpointSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      event = this.stripe.webhooks.constructEvent(
        rawBody.toString(),
        signature,
        endpointSecret
      );

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
          console.log(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error(`Webhook error: ${error.message}`);
      throw new BadRequestException(`Webhook error: ${error.message}`);
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
  @ApiOperation({ summary: 'Get user payment and application statistics' })
  @ApiResponse({ status: 200, description: 'Payment stats retrieved successfully' })
  async getUserPaymentStats(@Request() req) {
    try {
      const stats = await this.candidatePaymentService.getUserPaymentStats(req.user.sub);
      return successResponse(stats, 'Payment stats retrieved successfully');
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