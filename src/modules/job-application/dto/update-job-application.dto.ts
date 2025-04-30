import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JobApplicationStatus } from '../entities/job-application.entity';

export class UpdateJobApplicationDto {
  @IsOptional()
  @IsEnum(JobApplicationStatus)
  status?: JobApplicationStatus;

  @IsOptional()
  @IsString()
  coverLetter?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
} 