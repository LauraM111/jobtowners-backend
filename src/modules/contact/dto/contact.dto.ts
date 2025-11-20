import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactFormDto {
  @ApiProperty({ description: 'Name of the person contacting', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Email address', example: 'john@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number (optional)', example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ description: 'Subject of the message', example: 'Inquiry about services' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Message content', example: 'I would like to know more about...' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ description: 'reCAPTCHA token from Google reCAPTCHA', example: '03AGdBq27...' })
  @IsNotEmpty()
  @IsString()
  recaptchaToken: string;
} 