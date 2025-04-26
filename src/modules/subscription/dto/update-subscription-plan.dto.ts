import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSubscriptionPlanDto } from './create-subscription-plan.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateSubscriptionPlanDto extends PartialType(CreateSubscriptionPlanDto) {
  @ApiPropertyOptional({ description: 'Stripe price ID', example: 'price_1234567890' })
  @IsString()
  @IsOptional()
  stripePriceId?: string;
} 