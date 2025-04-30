import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { JobApplicationStatus } from '../entities/job-application.entity';

export class FilterJobApplicationDto {
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @IsOptional()
  @IsUUID()
  applicantId?: string;

  @IsOptional()
  @IsUUID()
  employerId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(JobApplicationStatus)
  status?: JobApplicationStatus;

  @IsOptional()
  @IsString()
  searchTerm?: string;
} 