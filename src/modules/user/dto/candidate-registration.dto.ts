import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { BaseRegistrationDto } from './base-registration.dto';

export class CandidateRegistrationDto extends BaseRegistrationDto {
  @ApiProperty({ example: 'base64-encoded-image', description: 'Student permit image (base64 encoded)' })
  @IsNotEmpty({ message: 'Student permit image is required' })
  @IsString({ message: 'Student permit image must be a string' })
  studentPermitImage: string;

  @ApiProperty({ example: 'base64-encoded-image', description: 'Proof of enrollment image (base64 encoded)' })
  @IsNotEmpty({ message: 'Proof of enrollment image is required' })
  @IsString({ message: 'Proof of enrollment image must be a string' })
  proofOfEnrollmentImage: string;
} 