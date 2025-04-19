import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check API health' })
  @ApiResponse({ 
    status: 200, 
    description: 'API is healthy',
    schema: {
      example: {
        success: true,
        message: 'API is healthy',
        data: {
          status: 'ok',
          timestamp: '2023-01-01T00:00:00.000Z'
        }
      }
    }
  })
  checkHealth() {
    return successResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }, 'API is healthy');
  }
} 