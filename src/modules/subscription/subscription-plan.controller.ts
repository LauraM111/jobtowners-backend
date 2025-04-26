import { 
  Controller, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, Query, BadRequestException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { successResponse } from '../../common/helpers/response.helper';
import { PlanStatus } from './entities/subscription-plan.entity';

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
export class SubscriptionPlanController {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new subscription plan (Admin only)' })
  @ApiResponse({ status: 201, description: 'Subscription plan created successfully' })
  async create(@Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto) {
    try {
      const subscriptionPlan = await this.subscriptionPlanService.create(createSubscriptionPlanDto);
      return successResponse(subscriptionPlan, 'Subscription plan created successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscription plans' })
  @ApiResponse({ status: 200, description: 'Subscription plans retrieved successfully' })
  @ApiQuery({ name: 'status', enum: PlanStatus, required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(@Query() query) {
    const subscriptionPlans = await this.subscriptionPlanService.findAll(query);
    return successResponse(subscriptionPlans, 'Subscription plans retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription plan by ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan retrieved successfully' })
  async findOne(@Param('id') id: string) {
    const subscriptionPlan = await this.subscriptionPlanService.findOne(id);
    return successResponse(subscriptionPlan, 'Subscription plan retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subscription plan (Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription plan updated successfully' })
  async update(
    @Param('id') id: string, 
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto
  ) {
    try {
      const subscriptionPlan = await this.subscriptionPlanService.update(id, updateSubscriptionPlanDto);
      return successResponse(subscriptionPlan, 'Subscription plan updated successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a subscription plan (Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription plan deleted successfully' })
  async remove(@Param('id') id: string) {
    try {
      await this.subscriptionPlanService.remove(id);
      return successResponse(null, 'Subscription plan deleted successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
} 