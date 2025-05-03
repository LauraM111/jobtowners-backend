import { Controller, Post, Body, UseGuards, Get, Param, Query, Request, UnauthorizedException, BadRequestException, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
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
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials or email not verified' })
  @UseGuards(LocalAuthGuard)
  async login(@Request() req, @Body() loginDto: LoginDto) {
    try {
      return this.authService.login(req.user);
    } catch (error) {
      if (error instanceof UnauthorizedException && 
          error.message === `Please verify your email before logging in ${process.env.FRONTEND_URL}/resend-verification`) {
        throw new UnauthorizedException({
          success: false, 
          message: 'Please verify your email before logging in',
          emailVerificationRequired: true,
          verificationUrl: `${process.env.FRONTEND_URL}/resend-verification`
        });
      }
      throw error;
    }
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Query('token') token: string) {
    try {
      await this.authService.verifyEmail(token);
      
      // Return a more detailed success response
      return { 
        success: true,
        message: 'Email verified successfully',
        data: {
          verified: true,
          loginUrl: `${process.env.FRONTEND_URL}/login`
        }
      };
    } catch (error) {
      console.error('Email verification error:', error);
      
      // Provide more specific error information
      if (error.message === 'Token expired') {
        throw new BadRequestException({
          success: false,
          message: 'Email verification token has expired. Please request a new one.',
          data: {
            expired: true,
            resendUrl: `${process.env.FRONTEND_URL}/resend-verification`
          }
        });
      } else if (error.message === 'Token already used') {
        throw new BadRequestException({
          success: false,
          message: 'This verification link has already been used.',
          data: {
            alreadyUsed: true,
            loginUrl: `${process.env.FRONTEND_URL}/login`
          }
        });
      } else {
        throw new BadRequestException({
          success: false,
          message: 'Invalid or expired verification token. Please request a new one.',
          data: {
            invalid: true,
            resendUrl: `${process.env.FRONTEND_URL}/resend-verification`
          }
        });
      }
    }
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendVerification(@Body('email') email: string) {
    try {
      await this.tokenService.resendVerificationByEmail(email);
      return successResponse(null, 'Verification email sent. Please check your inbox.');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('User not found');
      }
      if (error instanceof BadRequestException) {
        // If email is already verified
        throw error;
      }
      throw new BadRequestException('Failed to send verification email');
    }
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