import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { successResponse } from '../../common/helpers/response.helper';
import { SendTestEmailDto, SendNotificationEmailDto } from './dto/send-test-email.dto';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test email' })
  @ApiResponse({ 
    status: 200, 
    description: 'Test email sent successfully',
  })
  async sendTestEmail(@Body() sendTestEmailDto: SendTestEmailDto) {
    const { email, name = 'User' } = sendTestEmailDto;
    const result = await this.mailService.sendTestEmail(email);
    
    return successResponse({ success: result }, 'Test email sent');
  }

  @Post('welcome')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a welcome email' })
  @ApiResponse({ 
    status: 200, 
    description: 'Welcome email sent successfully',
  })
  async sendWelcomeEmail(@Body() sendTestEmailDto: SendTestEmailDto) {
    const { email, name = 'User' } = sendTestEmailDto;
    const result = await this.mailService.sendWelcomeEmail(email, name);
    
    return successResponse({ success: result }, 'Welcome email sent');
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