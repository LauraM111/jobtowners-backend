import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsNotEmpty({ message: 'First name is required' })
  @IsString({ message: 'First name must be a string' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString({ message: 'Last name must be a string' })
  lastName: string;

  @ApiProperty({ example: 'johndoe', description: 'Username' })
  @IsNotEmpty({ message: 'Username is required' })
  @IsString({ message: 'Username must be a string' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Username can only contain letters, numbers, underscores, and hyphens' })
  username: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsOptional()
  @IsPhoneNumber(null, { message: 'Invalid phone number format' })
  phoneNumber?: string;

  @ApiProperty({ example: 'Password123!', description: 'Password' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CANDIDATE, description: 'User role' })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, { message: 'Invalid role' })
  role: UserRole;
} 