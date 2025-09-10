import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsObject, Min, IsArray, IsBoolean } from 'class-validator';
import { PlanInterval, PlanStatus } from '../entities/subscription-plan.entity';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ description: 'Plan name', example: 'Premium Plan' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Plan description', example: 'Our premium plan with all features' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Plan price', example: 19.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Billing interval', enum: PlanInterval, example: PlanInterval.MONTHLY })
  @IsEnum(PlanInterval)
  interval: PlanInterval;

  @ApiPropertyOptional({ description: 'Interval count', example: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  intervalCount?: number;

  @ApiPropertyOptional({ description: 'Currency', example: 'usd' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Plan features', example: ['Feature 1', 'Feature 2'] })
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional({ description: 'Plan status', enum: PlanStatus, example: PlanStatus.ACTIVE })
  @IsEnum(PlanStatus)
  @IsOptional()
  status?: PlanStatus;

  @ApiPropertyOptional({ description: 'Number of jobs allowed with this plan', example: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  numberOfJobs?: number;

  @ApiPropertyOptional({ description: 'Number of resume views allowed with this plan', example: 50 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  resumeViewsCount?: number;

  @ApiPropertyOptional({ description: 'Maximum number of applicants allowed per job post', example: 10 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxApplicantsPerJob?: number;

  @ApiPropertyOptional({ 
    description: 'Skip Stripe integration for zero-price plans. If true and price is 0, no Stripe product/price will be created.',
    example: false
  })
  @IsBoolean()
  @IsOptional()
  skipStripe?: boolean;
} 