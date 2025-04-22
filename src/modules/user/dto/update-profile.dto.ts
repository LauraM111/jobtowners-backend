import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsPhoneNumber, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John', description: 'First name', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @ApiProperty({ example: 'Doe', description: 'Last name', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @ApiProperty({ example: 'johndoe', description: 'Username', required: false })
  @IsOptional()
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores and hyphens',
  })
  username?: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number', required: false })
  @IsOptional()
  @IsPhoneNumber(null, { message: 'Invalid phone number format' })
  phoneNumber?: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;
} 