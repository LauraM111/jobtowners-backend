import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Candidate plan ID' })
  @IsNotEmpty()
  @IsUUID()
  planId: string;
} 