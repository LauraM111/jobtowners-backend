import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, Matches, MinLength } from 'class-validator';
import { UserRole, UserStatus } from '../entities/user.entity';

export class AdminUpdateUserDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  firstName?: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;

  @ApiProperty({ example: 'johndoe', description: 'Username' })
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Username can only contain letters, numbers, underscores, and hyphens' })
  username?: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsOptional()
  
  phoneNumber?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CANDIDATE, description: 'User role' })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid role' })
  role?: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE, description: 'User status' })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid status' })
  status?: UserStatus;
} 