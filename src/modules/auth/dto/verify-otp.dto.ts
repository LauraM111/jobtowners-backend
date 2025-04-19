import { IsString, IsNotEmpty, Length, IsNumber, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'OTP code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class ResendOtpDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  userId: number;
} 