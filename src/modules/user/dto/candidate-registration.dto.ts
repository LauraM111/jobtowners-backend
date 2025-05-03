import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsBoolean, IsPhoneNumber, IsOptional, IsBase64 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CandidateRegistrationDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'Password123!', description: 'Password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: true, description: 'Terms acceptance' })
  @IsBoolean()
  @IsNotEmpty()
  termsAccepted: boolean;

  @ApiProperty({ example: 'base64-encoded-image', description: 'Student permit image (base64)' })
  @IsString()
  @IsNotEmpty()
  studentPermitImage: string;

  @ApiProperty({ example: 'base64-encoded-image', description: 'Proof of enrollment image (base64)' })
  @IsString()
  @IsNotEmpty()
  proofOfEnrollmentImage: string;

  @ApiProperty({ example: 'candidate', description: 'User type', required: false })
  @IsString()
  @IsOptional()
  userType?: string;

  @ApiPropertyOptional({ example: 'johndoe', description: 'Username (not used)' })
  @IsString()
  @IsOptional()
  username?: string;
} 