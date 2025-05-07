import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, Min, IsString } from 'class-validator';
import { JobType } from '../entities/job.entity';
import { Transform } from 'class-transformer';

export class JobTypeFilterDto {
  @ApiProperty({
    description: 'Job type to filter by',
    enum: JobType,
    example: JobType.PART_TIME
  })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiPropertyOptional({
    description: 'Number of results to return',
    example: 10,
    default: 10
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Number of results to skip',
    example: 0,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Search term to filter jobs by title or description',
    example: 'developer'
  })
  @IsOptional()
  @IsString()
  search?: string;
} 