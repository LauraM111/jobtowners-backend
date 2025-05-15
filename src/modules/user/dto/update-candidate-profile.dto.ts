import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, IsBoolean } from 'class-validator';

export class UpdateCandidateProfileDto {
  @ApiProperty({ required: false, description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, description: 'Phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false, description: 'URL to student permit image' })
  @IsOptional()
  @IsUrl()
  studentPermitImage?: string;

  @ApiProperty({ required: false, description: 'URL to proof of enrollment image' })
  @IsOptional()
  @IsUrl()
  proofOfEnrollmentImage?: string;

  @ApiProperty({ required: false, description: 'Terms acceptance status' })
  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;
} 