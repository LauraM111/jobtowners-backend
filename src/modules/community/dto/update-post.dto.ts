import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostType } from '../entities/community-post.entity';

export class UpdatePostDto {
  @ApiProperty({
    description: 'Title of the post',
    example: 'Updated: Tips for Job Seekers in Tech Industry',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: 'Content of the post',
    example: 'Updated content with more tips...',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: 'Type of post',
    enum: PostType,
    example: PostType.CANDIDATE,
    required: false,
  })
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;
} 