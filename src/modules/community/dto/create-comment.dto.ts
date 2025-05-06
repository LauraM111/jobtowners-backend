import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Content of the comment',
    example: 'Great post! Thanks for sharing.',
  })
  @IsNotEmpty()
  @IsString()
  content: string;
} 