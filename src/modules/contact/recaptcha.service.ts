import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly recaptchaSecretKey: string;
  private readonly recaptchaVerifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.recaptchaSecretKey = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
    
    if (!this.recaptchaSecretKey) {
      this.logger.warn('RECAPTCHA_SECRET_KEY is not configured. reCAPTCHA verification will be skipped.');
    }
  }

  async verifyRecaptcha(token: string): Promise<void> {
    // If no secret key is configured, skip verification (for development)
    if (!this.recaptchaSecretKey) {
      this.logger.warn('Skipping reCAPTCHA verification - RECAPTCHA_SECRET_KEY not configured');
      return;
    }

    if (!token) {
      throw new BadRequestException('reCAPTCHA token is required');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<RecaptchaResponse>(
          this.recaptchaVerifyUrl,
          null,
          {
            params: {
              secret: this.recaptchaSecretKey,
              response: token,
            },
          }
        )
      );

      const { success, 'error-codes': errorCodes } = response.data;

      if (!success) {
        this.logger.error('reCAPTCHA verification failed', errorCodes);
        throw new BadRequestException('reCAPTCHA verification failed. Please try again.');
      }

      this.logger.log('reCAPTCHA verification successful');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error('Error verifying reCAPTCHA', error);
      throw new BadRequestException('Failed to verify reCAPTCHA. Please try again.');
    }
  }
}


