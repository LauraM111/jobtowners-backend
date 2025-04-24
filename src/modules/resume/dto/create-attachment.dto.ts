import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';

export class CreateAttachmentDto {
  @ApiProperty({ 
    description: 'Name of the attachment file', 
    example: 'Certificate of Excellence' 
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ 
    description: 'URL of the uploaded attachment', 
    example: 'https://example.com/documents/certificate.pdf' 
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  fileUrl: string;

  @ApiProperty({ 
    description: 'Optional description of the attachment', 
    example: 'Awarded for outstanding performance in 2023',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;
} 