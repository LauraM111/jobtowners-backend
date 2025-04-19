import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto, ResendOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp.service';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Login successful' },
        data: {
          properties: {
            access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: {
              properties: {
                id: { type: 'number', example: 1 },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
                email: { type: 'string', example: 'john.doe@example.com' },
                role: { type: 'string', example: 'candidate' },
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return successResponse(result, 'Login successful');
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP' })
  @ApiResponse({ 
    status: 200, 
    description: 'Email verified successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP code' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyEmail(@Body() verifyOtpDto: VerifyOtpDto) {
    const result = await this.otpService.verifyOtp(
      verifyOtpDto.userId,
      verifyOtpDto.code,
    );
    
    return successResponse({ verified: result }, 'Email verified successfully');
  }

  @Post('resend-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP code' })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP code resent successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    await this.otpService.resendOtp(resendOtpDto.userId);
    
    return successResponse(null, 'OTP code resent successfully');
  }
} 