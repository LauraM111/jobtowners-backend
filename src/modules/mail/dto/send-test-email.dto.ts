import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class SendTestEmailDto {
  @ApiProperty({
    description: 'Email address to send the test email to',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Name of the recipient',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;
}

export class SendNotificationEmailDto extends SendTestEmailDto {
  @ApiProperty({
    description: 'Notification message',
    example: 'You have a new message from a potential employer.',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Action URL',
    example: 'http://localhost:3000/messages',
    required: false,
  })
  @IsString()
  @IsOptional()
  actionUrl?: string;
} 