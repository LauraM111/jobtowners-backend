import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { VerificationStatus } from '../entities/job.entity';

export class VerifyJobDto {
  @ApiProperty({ 
    description: 'Verification status', 
    enum: VerificationStatus, 
    example: VerificationStatus.APPROVED 
  })
  @IsEnum(VerificationStatus)
  verificationStatus: VerificationStatus;

  @ApiPropertyOptional({ 
    description: 'Reason for rejection (required if status is REJECTED)', 
    example: 'Job description contains inappropriate content' 
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
} 