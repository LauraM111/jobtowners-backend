import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostType } from '../entities/community-post.entity';

export class CreatePostDto {
  @ApiProperty({
    description: 'Title of the post',
    example: 'Tips for Job Seekers in Tech Industry',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Content of the post',
    example: 'Here are some tips for job seekers in the tech industry...',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Type of post',
    enum: PostType,
    example: PostType.CANDIDATE,
  })
  @IsNotEmpty()
  @IsEnum(PostType)
  postType: PostType;
} 