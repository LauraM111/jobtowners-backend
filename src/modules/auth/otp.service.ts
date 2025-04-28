import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import OTP from './entities/otp.entity';
import { User } from '../user/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { UserService } from '../user/user.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectModel(OTP)
    private otpModel: typeof OTP,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
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
  async createOtp(user: User, expiresInMinutes: number = 10): Promise<OTP> {
    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
    
    // Create and save the OTP using the user's ID
    return this.otpModel.create({
      code,
      expiresAt,
      userId: user.id,
    });
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
    const user = await this.userService.findById(userId);
    user.isEmailVerified = true;
    await user.save();

    return true;
  }

  /**
   * Resend OTP to user
   */
  async resendOtp(userId: string): Promise<OTP> {
    // Find the user first
    const user = await this.userService.findOne(userId);
    
    // Pass the user object to createOtp
    return this.createOtp(user);
  }

  async verifyEmail(userId: number, otp: string): Promise<boolean> {
    // Find the OTP
    const otpEntity = await this.otpModel.findOne({
      where: {
        userId,
        code: otp,
        used: false,
      },
    });

    // Check if OTP exists
    if (!otpEntity) {
      throw new BadRequestException('Invalid OTP code');
    }

    // Check if OTP is expired
    if (new Date() > otpEntity.expiresAt) {
      throw new BadRequestException('OTP code has expired');
    }

    // Mark OTP as used
    otpEntity.used = true;
    await otpEntity.save();

    // Update user's email verification status
    const user = await this.userService.findById(userId);
    user.isEmailVerified = true;
    await user.save();

    return true;
  }
} 