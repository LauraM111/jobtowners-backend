import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './modules/auth/decorators/public.decorator';
import { successResponse } from './common/helpers/response.helper';

@ApiTags('App')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Application is running' })
  healthCheck() {
    return successResponse({ status: 'ok', timestamp: new Date().toISOString() }, 'Application is running');
  }
}

@Controller('*')
export class CatchAllController {
  @Get()
  @Public()
  notFound() {
    return {
      success: false,
      message: 'Endpoint not found',
      data: null
    };
  }
} 