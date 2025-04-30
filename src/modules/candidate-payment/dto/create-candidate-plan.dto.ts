import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';
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
} 