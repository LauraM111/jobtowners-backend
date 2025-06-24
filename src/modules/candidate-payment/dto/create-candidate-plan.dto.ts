import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCandidatePlanDto {
  @ApiProperty({ description: 'Plan name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Plan description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Plan price', default: 15.00 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Currency', default: 'usd' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Daily application limit', default: 15 })
  @IsNumber()
  @Min(1)
  dailyApplicationLimit: number;

  @ApiProperty({ 
    description: 'Skip Stripe integration for zero-price plans. If true and price is 0, no Stripe product/price will be created.',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  skipStripe?: boolean;
} 