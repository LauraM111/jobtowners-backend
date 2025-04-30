import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Conversation ID', required: true })
  @IsNotEmpty()
  @IsString()
  conversationId: string;
} 