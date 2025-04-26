import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsObject, Min, IsArray } from 'class-validator';
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
} 