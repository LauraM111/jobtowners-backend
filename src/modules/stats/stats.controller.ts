import { Controller, Get, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../user/entities/user.entity';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboardStats() {
    const stats = await this.statsService.getDashboardStats();
    return successResponse(stats, 'Dashboard statistics retrieved successfully');
  }

  @Get('performance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get performance overview data for charts' })
  @ApiResponse({ status: 200, description: 'Performance data retrieved successfully' })
  @ApiQuery({ 
    name: 'period', 
    enum: ['week', 'month', 'quarter', 'year'], 
    required: false,
    description: 'Time period for the data'
  })
  async getPerformanceOverview(@Query('period') period: string = 'month') {
    const data = await this.statsService.getPerformanceOverview(period);
    return successResponse(data, 'Performance data retrieved successfully');
  }

  @Get('user-distribution')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user type distribution for pie chart' })
  @ApiResponse({ status: 200, description: 'User distribution data retrieved successfully' })
  async getUserTypeDistribution() {
    const data = await this.statsService.getUserTypeDistribution();
    return successResponse(data, 'User distribution data retrieved successfully');
  }

  @Get('application-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get job application status distribution for pie chart' })
  @ApiResponse({ status: 200, description: 'Application status data retrieved successfully' })
  async getJobApplicationStatusDistribution() {
    const data = await this.statsService.getJobApplicationStatusDistribution();
    return successResponse(data, 'Application status data retrieved successfully');
  }

  @Get('candidate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get candidate-specific statistics' })
  @ApiResponse({ status: 200, description: 'Candidate statistics retrieved successfully' })
  async getCandidateStats(@Request() req) {
    try {
      const userId = req.user.sub;
      const stats = await this.statsService.getCandidateStats(userId);
      return successResponse(stats, 'Candidate statistics retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('employer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employer-specific statistics' })
  @ApiResponse({ status: 200, description: 'Employer statistics retrieved successfully' })
  async getEmployerStats(@Request() req) {
    try {
      const userId = req.user.sub;
      const stats = await this.statsService.getEmployerStats(userId);
      return successResponse(stats, 'Employer statistics retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
} 