import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';

export class EmployerRegistrationDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: 'Password123!', description: 'Password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: true, description: 'Terms acceptance' })
  @IsNotEmpty()
  @IsBoolean()
  termsAccepted: boolean;

  @ApiPropertyOptional({ example: 'johndoe', description: 'Username (not used)' })
  @IsString()
  @IsOptional()
  username?: string;
  
  @ApiPropertyOptional({ example: 'employer', description: 'User type (determined by endpoint)' })
  @IsString()
  @IsOptional()
  userType?: string;
} 