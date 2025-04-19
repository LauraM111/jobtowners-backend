import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { successResponse } from '../../common/helpers/response.helper';
import { SendTestEmailDto, SendNotificationEmailDto } from './dto/send-test-email.dto';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService
  ) {}

  @Get('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check mail configuration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Mail configuration check',
  })
  async checkMailConfig() {
    return successResponse({ 
      configured: true,
      provider: 'Mailgun',
      domain: this.configService.get<string>('MAILGUN_DOMAIN'),
      fromEmail: this.configService.get<string>('MAIL_FROM_ADDRESS'),
    }, 'Mail configuration check');
  }

  @Post('test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a test email (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Test email sent successfully',
  })
  async sendTestEmail(@Body() body: { email: string }) {
    const { email } = body;
    const result = await this.mailService.sendTestEmail(email);
    
    if (result) {
      return successResponse(null, 'Test email sent successfully');
    } else {
      return successResponse(null, 'Failed to send test email');
    }
  }

  @Post('welcome')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a welcome email (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Welcome email sent successfully',
  })
  async sendWelcomeEmail(@Body() body: { email: string; name: string }) {
    const { email, name } = body;
    
    // Create a mock user object with the required properties
    const mockUser = {
      email,
      firstName: name,
      role: 'user',
      status: 'active'
    };
    
    const result = await this.mailService.sendWelcomeEmail(mockUser);
    
    if (result) {
      return successResponse(null, 'Welcome email sent successfully');
    } else {
      return successResponse(null, 'Failed to send welcome email');
    }
  }

  @Post('notification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a notification email' })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification email sent successfully',
  })
  async sendNotificationEmail(@Body() body: SendNotificationEmailDto) {
    const { email, name = 'User', message, actionUrl } = body;
    const result = await this.mailService.sendNotificationEmail(email, name, message, actionUrl);
    
    return successResponse({ success: result }, 'Notification email sent');
  }
} 