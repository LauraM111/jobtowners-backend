import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectPostDto {
  @ApiProperty({
    description: 'Reason for rejecting the post',
    example: 'This post violates our community guidelines.',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;
} 