import { Controller, Post, Body, UseGuards, Get, Param, Query, Request, UnauthorizedException, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { TokenService } from './token.service';
import { TokenType } from './entities/token.entity';
import { successResponse } from '../../common/helpers/response.helper';
import { Logger } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phoneNumber: { type: 'string' },
                userType: { type: 'string' },
                role: { type: 'string' },
                status: { type: 'string' },
                isEmailVerified: { type: 'boolean' },
                isActive: { type: 'boolean' },
                companyName: { type: 'string' },
                // Add other user properties here
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials' })
  @UseGuards(LocalAuthGuard)
  async login(@Request() req, @Body() loginDto: LoginDto) {
    return this.authService.login(req.user);
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Query('token') token: string) {
    try {
      await this.authService.verifyEmail(token);
      // Redirect to frontend success page or return success message
      return { message: 'Email verified successfully' };
    } catch (error) {
      // Instead of letting the exception filter handle it with a generic message,
      // provide more specific error information
      if (error.message === 'Token expired') {
        throw new BadRequestException('Email verification token has expired. Please request a new one.');
      } else if (error.message === 'Token already used') {
        throw new BadRequestException('This verification link has already been used.');
      } else {
        throw new BadRequestException('Invalid or expired verification token. Please request a new one.');
      }
    }
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
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;
    const user = await this.tokenService.validatePasswordResetToken(token);
    await this.authService.resetPassword(user.id, password);
    return { message: 'Password has been reset successfully' };
  }
} 