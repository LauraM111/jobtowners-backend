import { PartialType } from '@nestjs/swagger';
import { CreateCandidatePlanDto } from './create-candidate-plan.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCandidatePlanDto extends PartialType(CreateCandidatePlanDto) {
  @ApiProperty({ description: 'Stripe Price ID', required: false })
  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @ApiProperty({ description: 'Stripe Product ID', required: false })
  @IsOptional()
  @IsString()
  stripeProductId?: string;
} 