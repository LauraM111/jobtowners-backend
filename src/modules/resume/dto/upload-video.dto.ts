import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class UploadVideoDto {
  @ApiProperty({ 
    description: 'URL of the uploaded video', 
    example: 'https://example.com/videos/resume-video.mp4' 
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  videoUrl: string;
} 