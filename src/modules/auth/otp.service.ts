import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { v4 as uuidv4 } from 'uuid';
import OTP from './entities/otp.entity';
import { User } from '../user/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OTPService {
  private readonly logger = new Logger(OTPService.name);

  constructor(
    @InjectModel(OTP)
    private otpModel: typeof OTP,
    private mailService: MailService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate a random OTP code
   */
  private generateOTPCode(length: number = 6): string {
    // Generate a random numeric code
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  /**
   * Create a new OTP for a user
   */
  async createOTP(user: User, expiresInMinutes: number = 10): Promise<OTP> {
    // Generate a random OTP code
    const code = this.generateOTPCode();
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
    
    // Create and save the OTP
    const otp = await this.otpModel.create({
      code,
      expiresAt,
      userId: user.id,
    });
    
    // Send OTP email
    await this.mailService.sendOtpEmail(user, code);
    
    return otp;
  }

  /**
   * Verify an OTP code
   */
  async verifyOTP(userId: string, code: string): Promise<boolean> {
    // Find the most recent unused OTP for the user
    const otp = await this.otpModel.findOne({
      where: {
        userId,
        code,
        used: false,
      },
      order: [['createdAt', 'DESC']],
    });
    
    // Check if OTP exists
    if (!otp) {
      throw new BadRequestException('Invalid OTP');
    }
    
    // Check if OTP is expired
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }
    
    // Get the user
    const user = await this.userService.findById(userId);
    
    // Mark OTP as used
    otp.used = true;
    await otp.save();
    
    return true;
  }

  /**
   * Resend OTP by email
   */
  async resendOTPByEmail(email: string): Promise<OTP> {
    try {
      // Find the user by email
      const user = await this.userService.findByEmail(email);
      
      // Create a new OTP
      return this.createOTP(user);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Validate OTP for password reset
   */
  async validateOTPForPasswordReset(userId: string, code: string): Promise<boolean> {
    // Find the most recent unused OTP for the user
    const otp = await this.otpModel.findOne({
      where: {
        userId,
        code,
        used: false,
      },
      order: [['createdAt', 'DESC']],
    });
    
    // Check if OTP exists
    if (!otp) {
      throw new BadRequestException('Invalid OTP');
    }
    
    // Check if OTP is expired
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }
    
    // Get the user
    const user = await this.userService.findById(userId);
    
    // Mark OTP as used
    otp.used = true;
    await otp.save();
    
    return true;
  }
} 