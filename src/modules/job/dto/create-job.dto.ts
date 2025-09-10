import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, IsEmail, IsOptional, IsArray, IsEnum, 
  IsDateString, IsNotEmpty, IsUUID, ValidateIf
} from 'class-validator';
import { JobType, Gender, JobStatus, VerificationStatus } from '../entities/job.entity';

export class CreateJobDto {
  @ApiProperty({ description: 'Job title', example: 'Software Engineer' })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @ApiProperty({ description: 'Title for the job posting', example: 'Senior Software Engineer Position' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Detailed job description', example: 'We are looking for a skilled software engineer...' })
  @IsString()
  @IsNotEmpty()
  jobDescription: string;

  @ApiPropertyOptional({ description: 'Email address for applications', example: 'jobs@company.com' })
  @ValidateIf(o => o.emailAddress && o.emailAddress.trim() !== '')
  @IsEmail()
  @IsOptional()
  emailAddress?: string;

  @ApiPropertyOptional({ description: 'Job specialisms', example: ['JavaScript', 'React', 'Node.js'] })
  @IsArray()
  @IsOptional()
  specialisms?: string[];

  @ApiPropertyOptional({ description: 'Job category', example: 'Information Technology' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Job type', enum: JobType, example: JobType.FULL_TIME })
  @IsEnum(JobType)
  @IsOptional()
  jobType?: JobType;

  @ApiPropertyOptional({ description: 'Offered salary', example: '$5000 - $7000' })
  @IsString()
  @IsOptional()
  offeredSalary?: string;

  @ApiPropertyOptional({ description: 'Career level', example: 'Senior' })
  @IsString()
  @IsOptional()
  careerLevel?: string;

  @ApiPropertyOptional({ description: 'Required experience', example: '3-5 years' })
  @IsString()
  @IsOptional()
  experience?: string;

  @ApiPropertyOptional({ description: 'Preferred gender', enum: Gender, example: Gender.ANY })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Industry', example: 'Software Development' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Required qualification', example: "Bachelor's Degree" })
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiPropertyOptional({ description: 'Application deadline date', example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  applicationDeadlineDate?: string;

  @ApiPropertyOptional({ description: 'Country', example: 'United States' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'City', example: 'New York' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'State', example: 'NY' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Latitude', example: 40.7128 })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude', example: -74.0060 })
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Postal Code', example: '10001' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Complete address', example: '123 Main St, New York, NY 10001' })
  @IsString()
  @IsOptional()
  completeAddress?: string;

  @ApiPropertyOptional({ description: 'Additional attachments', example: ['https://example.com/attachment1.pdf'] })
  @IsArray()
  @IsOptional()
  additionalAttachments?: string[];

  @ApiPropertyOptional({ description: 'Job status', enum: JobStatus, example: JobStatus.ACTIVE })
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @ApiProperty({ description: 'Company ID to associate with this job', required: false })
  @IsOptional()
  @IsUUID()
  companyId?: string;
} 