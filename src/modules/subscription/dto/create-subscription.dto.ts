import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ 
    description: 'ID of the subscription plan to purchase', 
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @IsUUID()
  @IsNotEmpty()
  planId: string;
} 