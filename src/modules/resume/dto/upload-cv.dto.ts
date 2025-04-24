import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class UploadCvDto {
  @ApiProperty({ 
    description: 'URL of the uploaded CV document', 
    example: 'https://example.com/documents/resume.pdf' 
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  cvUrl: string;
} 