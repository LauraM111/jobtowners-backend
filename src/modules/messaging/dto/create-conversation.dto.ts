import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'Candidate ID' })
  @IsNotEmpty()
  @IsUUID()
  candidateId: string;

  @ApiProperty({ description: 'Job Application ID' })
  @IsNotEmpty()
  @IsUUID()
  jobApplicationId: string;
} 