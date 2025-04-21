import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import Token, { TokenType } from './entities/token.entity';
import { User } from '../user/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectModel(Token)
    private tokenModel: typeof Token,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate a random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new verification token for a user
   */
  async createVerificationToken(user: User, expiresInHours: number = 24): Promise<Token> {
    // Generate a random token
    const token = this.generateToken();
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    
    // Create and save the token
    const verificationToken = await this.tokenModel.create({
      token,
      type: TokenType.EMAIL_VERIFICATION,
      expiresAt,
      userId: user.id,
    });

    // Send verification email
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    
    await this.mailService.sendVerificationEmail(user.email, user.firstName, verificationUrl);
    
    return verificationToken;
  }

  /**
   * Create a password reset token
   */
  async createPasswordResetToken(user: User, expiresInHours: number = 1): Promise<Token> {
    // Generate a random token
    const token = this.generateToken();
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    
    // Create and save the token
    const resetToken = await this.tokenModel.create({
      token,
      type: TokenType.PASSWORD_RESET,
      expiresAt,
      userId: user.id,
    });

    // Send password reset email
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    
    await this.mailService.sendPasswordResetEmail(user.email, user.firstName, resetUrl);
    
    return resetToken;
  }

  /**
   * Verify a token
   */
  async verifyToken(token: string, type: TokenType): Promise<User> {
    // Find the token
    const tokenRecord = await this.tokenModel.findOne({
      where: {
        token,
        type,
      },
    });

    // Check if token exists
    if (!tokenRecord) {
      throw new BadRequestException('Invalid token');
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
      throw new BadRequestException('Token has expired');
    }

    // Get the user
    const user = await this.userService.findOne(tokenRecord.userId);
    
    // If it's an email verification token, update user's email verification status
    if (type === TokenType.EMAIL_VERIFICATION) {
      // Check if email is already verified
      if (user.emailVerified) {
        // If already verified, just return the user without error
        // We'll still mark the token as used
        tokenRecord.used = true;
        await tokenRecord.save();
        return user;
      }
      
      // If not verified, update the status
      user.emailVerified = true;
      await user.save();
    }

    // Mark token as used
    tokenRecord.used = true;
    await tokenRecord.save();

    return user;
  }

  /**
   * Resend verification email by email
   */
  async resendVerificationByEmail(email: string): Promise<Token> {
    try {
      // Find the user by email
      const user = await this.userService.findByEmail(email);
      
      // Check if email is already verified
      if (user.emailVerified) {
        throw new BadRequestException('Email is already verified');
      }
      
      // Create a new verification token
      return this.createVerificationToken(user);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException('User not found');
    }
  }
} 