import { IsOptional, IsString, IsEnum, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JobApplicationStatus } from '../entities/job-application.entity';

export class FilterJobApplicationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: JobApplicationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  jobIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  applicantId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  offset?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
} 