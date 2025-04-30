import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateJobApplicationDto {
  @IsNotEmpty()
  @IsUUID()
  jobId: string;

  @IsNotEmpty()
  @IsUUID()
  resumeId: string;

  @IsOptional()
  @IsString()
  coverLetter?: string;
} 