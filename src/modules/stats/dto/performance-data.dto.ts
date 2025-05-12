import { ApiProperty } from '@nestjs/swagger';

export class TimeSeriesPointDto {
  @ApiProperty({ example: '2023-05-01', description: 'Date point' })
  date: string;

  @ApiProperty({ example: 10, description: 'Value for this date' })
  count?: number;

  @ApiProperty({ example: 150.00, description: 'Amount for this date' })
  amount?: number;
}

export class PerformanceDataDto {
  @ApiProperty({ type: [TimeSeriesPointDto], description: 'User registration data over time' })
  userRegistrations: TimeSeriesPointDto[];

  @ApiProperty({ type: [TimeSeriesPointDto], description: 'Revenue data over time' })
  revenue: TimeSeriesPointDto[];

  @ApiProperty({ type: [TimeSeriesPointDto], description: 'Job application data over time' })
  jobApplications: TimeSeriesPointDto[];

  @ApiProperty({ type: [TimeSeriesPointDto], description: 'Jobs posted data over time' })
  jobsPosted: TimeSeriesPointDto[];

  @ApiProperty({ example: 'month', enum: ['week', 'month', 'quarter', 'year'], description: 'Time period for the data' })
  period: string;
} 