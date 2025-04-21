import { Controller, Post, Body, UseGuards, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { TokenService } from './token.service';
import { TokenType } from './entities/token.entity';
import { successResponse } from '../../common/helpers/response.helper';
import { Logger } from '@nestjs/common';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return successResponse(result, 'Login successful');
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Query('token') token: string) {
    await this.tokenService.verifyToken(token, TokenType.EMAIL_VERIFICATION);
    return successResponse(null, 'Email verified successfully');
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerification(@Body('email') email: string) {
    await this.tokenService.resendVerificationByEmail(email);
    return successResponse(null, 'Verification email sent');
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body('email') email: string) {
    const user = await this.authService.findUserByEmail(email);
    await this.tokenService.createPasswordResetToken(user);
    return successResponse(null, 'Password reset email sent');
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    this.logger.log(`Resetting password with token: ${token.substring(0, 10)}...`);
    
    const user = await this.tokenService.verifyToken(token, TokenType.PASSWORD_RESET);
    this.logger.log(`User found: ${user.id}`);
    
    await this.authService.resetPassword(user.id, password);
    return successResponse(null, 'Password reset successful');
  }
} 