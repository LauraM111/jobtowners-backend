import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { v4 as uuidv4 } from 'uuid';
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
    const user = await this.userService.findById(tokenRecord.userId);
    
    // If it's an email verification token, update user's email verification status
    if (type === TokenType.EMAIL_VERIFICATION) {
      // Check if email is already verified
      if (user.isEmailVerified) {
        // If already verified, just return the user without error
        // We'll still mark the token as used
        tokenRecord.used = true;
        await tokenRecord.save();
        return user;
      }
      
      // If not verified, update the status
      user.isEmailVerified = true;
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
      if (user.isEmailVerified) {
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

  /**
   * Generate an access token for a user
   */
  async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      userId: user.id,
    };
    
    // This is just a placeholder - you'll need to implement the actual JWT signing
    return 'access_token_placeholder';
  }

  /**
   * Generate a refresh token for a user
   */
  async generateRefreshToken(user: User): Promise<string> {
    // Generate a random token
    const refreshToken = this.generateToken();
    
    // Calculate expiration time (e.g., 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Add REFRESH to TokenType enum if it doesn't exist
    await this.tokenModel.create({
      token: refreshToken,
      userId: user.id,
      type: 'refresh', // Use string instead of enum if REFRESH doesn't exist in TokenType
      expiresAt: expiresAt,
    });
    
    return refreshToken;
  }

  /**
   * Verify an email verification token
   */
  async verifyEmailToken(token: string): Promise<User> {
    const tokenRecord = await this.tokenModel.findOne({
      where: { token, type: TokenType.EMAIL_VERIFICATION }
    });
    
    if (!tokenRecord) {
      throw new BadRequestException('Invalid token');
    }
    
    const user = await this.userService.findById(tokenRecord.userId);
    
    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }
    
    user.isEmailVerified = true;
    await user.save();
    
    return user;
  }

  /**
   * Validate a password reset token
   */
  async validatePasswordResetToken(token: string): Promise<User> {
    const tokenRecord = await this.tokenModel.findOne({
      where: { token, type: TokenType.PASSWORD_RESET }
    });
    
    if (!tokenRecord) {
      throw new BadRequestException('Invalid token');
    }
    
    const user = await this.userService.findById(tokenRecord.userId);
    
    if (!user.isEmailVerified) {
      throw new BadRequestException('Email not verified');
    }
    
    return user;
  }

  /**
   * Find a token by its properties
   */
  async findOne(options: any): Promise<Token> {
    const token = await this.tokenModel.findOne({
      where: options,
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return token;
  }

  /**
   * Update a token
   */
  async update(id: string, data: Partial<Token>): Promise<Token> {
    const token = await this.tokenModel.findByPk(id);

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    await token.update(data);
    return token;
  }
} 