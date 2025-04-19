import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { OTP } from './entities/otp.entity';
import { User } from '../user/entities/user.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectModel(OTP)
    private otpModel: typeof OTP,
    @InjectModel(User)
    private userModel: typeof User,
    private mailService: MailService,
  ) {}

  /**
   * Generate a random 6-digit OTP code
   */
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create a new OTP for a user
   */
  async createOtp(userId: number): Promise<OTP> {
    // Check if user exists
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Generate OTP code
    const code = this.generateOtpCode();
    
    // Set expiration time (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Delete any existing unused OTPs for this user
    await this.otpModel.destroy({
      where: {
        userId,
        used: false,
      },
    });

    // Create new OTP
    const otp = await this.otpModel.create({
      code,
      userId,
      expiresAt,
      used: false,
    });

    // Send OTP email
    try {
      await this.mailService.sendOtpEmail(user, code);
    } catch (error) {
      this.logger.error(`Failed to send OTP email: ${error.message}`, error.stack);
      // Continue even if email fails
    }

    return otp;
  }

  /**
   * Verify an OTP code
   */
  async verifyOtp(userId: number, code: string): Promise<boolean> {
    // Find the OTP
    const otp = await this.otpModel.findOne({
      where: {
        userId,
        code,
        used: false,
      },
    });

    // Check if OTP exists
    if (!otp) {
      throw new BadRequestException('Invalid OTP code');
    }

    // Check if OTP is expired
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('OTP code has expired');
    }

    // Mark OTP as used
    otp.used = true;
    await otp.save();

    // Update user's email verification status
    const user = await this.userModel.findByPk(userId);
    user.emailVerified = true;
    await user.save();

    return true;
  }

  /**
   * Resend OTP to user
   */
  async resendOtp(userId: number): Promise<OTP> {
    return this.createOtp(userId);
  }
} 