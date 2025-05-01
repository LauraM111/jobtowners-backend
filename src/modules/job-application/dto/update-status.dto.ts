import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JobApplicationStatus } from '../entities/job-application.entity';

export class UpdateStatusDto {
  @ApiProperty({ 
    description: 'New status for the application',
    enum: Object.values(JobApplicationStatus),
    example: 'shortlisted',
    examples: {
      pending: { value: 'pending', summary: 'Application is pending review' },
      reviewed: { value: 'reviewed', summary: 'Application has been reviewed' },
      shortlisted: { value: 'shortlisted', summary: 'Candidate has been shortlisted' },
      rejected: { value: 'rejected', summary: 'Application has been rejected' },
      hired: { value: 'hired', summary: 'Candidate has been hired' },
      withdrawn: { value: 'withdrawn', summary: 'Candidate has withdrawn their application (candidate only)' }
    }
  })
  @IsNotEmpty()
  @IsEnum(JobApplicationStatus, { 
    message: `Status must be one of: ${Object.values(JobApplicationStatus).join(', ')}` 
  })
  status: JobApplicationStatus;
} 