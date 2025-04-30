import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FilterJobApplicationDto {
  @ApiProperty({ required: false, description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, description: 'Filter by job ID' })
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiProperty({ required: false, description: 'Filter by applicant ID' })
  @IsOptional()
  @IsString()
  applicantId?: string;

  @ApiProperty({ required: false, enum: ['employer', 'candidate', 'admin'], description: 'Filter by user type' })
  @IsOptional()
  @IsString()
  @IsEnum(['employer', 'candidate', 'admin'], { message: 'filter must be one of: employer, candidate, admin' })
  filter?: string;

  @ApiProperty({ required: false, type: Number, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiProperty({ required: false, type: Number, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must not exceed 100' })
  limit?: number = 20;
} 