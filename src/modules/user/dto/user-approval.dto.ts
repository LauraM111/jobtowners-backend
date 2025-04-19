import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class UserApprovalDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsNumber({}, { message: 'User ID must be a number' })
  userId: number;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE, description: 'New user status' })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(UserStatus, { message: 'Invalid status' })
  status: UserStatus;
} 