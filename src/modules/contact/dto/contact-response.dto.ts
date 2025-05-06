import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactResponseDto {
  @ApiProperty({
    description: 'Response message to the contact submission',
    example: 'Thank you for your inquiry. We will get back to you shortly.'
  })
  @IsNotEmpty()
  @IsString()
  message: string;
} 