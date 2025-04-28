import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { successResponse } from '../../common/helpers/response.helper';
import { SendTestEmailDto, SendNotificationEmailDto } from './dto/send-test-email.dto';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../user/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

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

  @Public()
  @Get('test')
  @ApiOperation({ summary: 'Send a test email' })
  @ApiResponse({ status: 200, description: 'Test email sent' })
  async sendTestEmail(@Query('email') email: string) {
    const success = await this.mailService.sendTestEmail(email);
    return successResponse({ success }, 'Test email sent');
  }

  @Public()
  @Post('welcome')
  @ApiOperation({ summary: 'Send a welcome email' })
  @ApiResponse({ status: 200, description: 'Welcome email sent' })
  async sendWelcomeEmail(@Body() body: { email: string; firstName: string; lastName: string }) {
    // Instead of creating a mock User object, just pass the required fields directly
    await this.mailService.sendWelcomeEmailSimple(
      body.email,
      body.firstName,
      body.lastName
    );
    return successResponse(null, 'Welcome email sent');
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