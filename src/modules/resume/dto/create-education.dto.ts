import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEducationDto {
  @ApiProperty({ 
    description: 'Name of the degree', 
    example: 'Bachelor of Science in Computer Science' 
  })
  @IsString()
  @IsNotEmpty()
  degreeName: string;

  @ApiProperty({ 
    description: 'Name of the university or institution', 
    example: 'Stanford University' 
  })
  @IsString()
  @IsNotEmpty()
  universityName: string;

  @ApiProperty({ 
    description: 'Start year of education', 
    example: '2015' 
  })
  @IsString()
  @IsNotEmpty()
  fromYear: string;

  @ApiProperty({ 
    description: 'End year of education (or "Present" for ongoing)', 
    example: '2019' 
  })
  @IsString()
  @IsNotEmpty()
  toYear: string;

  @ApiProperty({ 
    description: 'Description of the education', 
    example: 'Graduated with honors. Specialized in Artificial Intelligence.',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;
} 