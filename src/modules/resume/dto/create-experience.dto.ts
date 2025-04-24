import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateExperienceDto {
  @ApiProperty({ 
    description: 'Job position or title', 
    example: 'Senior Software Engineer' 
  })
  @IsString()
  @IsNotEmpty()
  position: string;

  @ApiProperty({ 
    description: 'Name of the company', 
    example: 'Google Inc.' 
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ 
    description: 'Start year of employment', 
    example: '2018' 
  })
  @IsString()
  @IsNotEmpty()
  fromYear: string;

  @ApiProperty({ 
    description: 'End year of employment (or "Present" for current job)', 
    example: 'Present' 
  })
  @IsString()
  @IsNotEmpty()
  toYear: string;

  @ApiProperty({ 
    description: 'Description of responsibilities and achievements', 
    example: 'Led a team of 5 developers to build a cloud-based solution...',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;
} 