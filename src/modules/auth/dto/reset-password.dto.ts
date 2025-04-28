import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token',
    example: 'a1b2c3d4e5f6...'
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewSecurePassword123!'
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
} 