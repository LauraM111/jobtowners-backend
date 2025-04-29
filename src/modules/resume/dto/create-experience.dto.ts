import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateExperienceDto {
  @ApiProperty({ example: 'Software Engineer', description: 'Job position' })
  @IsNotEmpty()
  @IsString()
  position: string;

  @ApiProperty({ example: 'Google', description: 'Company name' })
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiPropertyOptional({ example: '2020-01-01', description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2023-01-01', description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Developed web applications using React and Node.js', description: 'Job description' })
  @IsOptional()
  @IsString()
  description?: string;
} 