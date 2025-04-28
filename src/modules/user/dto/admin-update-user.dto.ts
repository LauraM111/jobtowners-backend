import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, Matches, MinLength, IsBoolean } from 'class-validator';
import { UserType, UserStatus } from '../entities/user.entity';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsOptional()
  
  phoneNumber?: string;

  @ApiProperty({ enum: UserType, example: UserType.CANDIDATE, description: 'User type' })
  @IsOptional()
  @IsEnum(UserType, { message: 'Invalid type' })
  userType?: UserType;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE, description: 'User status' })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid status' })
  status?: UserStatus;
} 