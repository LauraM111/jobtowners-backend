import { ApiProperty } from '@nestjs/swagger';

export class UserStatsDto {
  @ApiProperty({ example: 1000, description: 'Total number of users' })
  total: number;

  @ApiProperty({ example: 800, description: 'Number of active users' })
  active: number;

  @ApiProperty({ example: 600, description: 'Number of candidates' })
  candidates: number;

  @ApiProperty({ example: 200, description: 'Number of employers' })
  employers: number;

  @ApiProperty({ example: '5.25', description: 'User growth percentage compared to previous period' })
  growth: string;
}

export class RevenueStatsDto {
  @ApiProperty({ example: '15000.00', description: 'Total revenue' })
  total: string;

  @ApiProperty({ example: '10000.00', description: 'Revenue from candidate orders' })
  candidateOrders: string;

  @ApiProperty({ example: '5000.00', description: 'Revenue from subscriptions' })
  subscriptions: string;

  @ApiProperty({ example: '7.50', description: 'Revenue growth percentage compared to previous period' })
  growth: string;
}

export class OrderStatsDto {
  @ApiProperty({ example: 500, description: 'Total number of orders' })
  total: number;

  @ApiProperty({ example: 200, description: 'Number of active subscriptions' })
  subscriptions: number;
}

export class ApplicationStatsDto {
  @ApiProperty({ example: 1500, description: 'Total number of job applications' })
  total: number;
}

export class JobStatsDto {
  @ApiProperty({ example: 300, description: 'Total number of jobs' })
  total: number;
}

export class DashboardStatsDto {
  @ApiProperty({ type: UserStatsDto })
  users: UserStatsDto;

  @ApiProperty({ type: RevenueStatsDto })
  revenue: RevenueStatsDto;

  @ApiProperty({ type: OrderStatsDto })
  orders: OrderStatsDto;

  @ApiProperty({ type: ApplicationStatsDto })
  applications: ApplicationStatsDto;

  @ApiProperty({ type: JobStatsDto })
  jobs: JobStatsDto;
} 