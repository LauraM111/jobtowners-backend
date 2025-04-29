import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateEducationDto {
  @ApiProperty({ example: 'Harvard University', description: 'Name of the institution' })
  @IsNotEmpty()
  @IsString()
  institution: string;

  @ApiProperty({ example: 'Bachelor of Science', description: 'Degree obtained' })
  @IsNotEmpty()
  @IsString()
  degree: string;

  @ApiPropertyOptional({ example: 'Computer Science', description: 'Field of study' })
  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @ApiPropertyOptional({ example: '2018-09-01', description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2022-06-30', description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Graduated with honors', description: 'Additional description' })
  @IsOptional()
  @IsString()
  description?: string;
} 