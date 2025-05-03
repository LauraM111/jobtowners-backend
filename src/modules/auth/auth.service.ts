import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { UserStatus } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private jwtService: JwtService,
    private tokenService: TokenService,
  ) {}

  /**
   * Validate user credentials and return JWT token
   */
  async login(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email,
      userType: user.userType 
    };
    
    // Log the payload to verify it's correct
    console.log('Creating JWT with payload:', payload);
    
    const token = this.jwtService.sign(payload);
    
    // Log the token format to verify it's correct
    console.log('JWT Token format check:', {
      isString: typeof token === 'string',
      length: token.length,
      startsWithEy: token.startsWith('ey'),
      parts: token.split('.').length
    });
    
    // Return response in the format expected by the frontend
    return {
      success: true,
      message: 'Login successful',
      data: {
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          userType: user.userType,
          role: user.userType, // Include role for backward compatibility
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          companyName: user.companyName,
          studentPermitImage: user.studentPermitImage,
          proofOfEnrollmentImage: user.proofOfEnrollmentImage,
          termsAccepted: user.termsAccepted,
          stripeCustomerId: user.stripeCustomerId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    };
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<any> {
    console.log(`Attempting to validate user with email: ${email}`);
    
    try {
      const user = await this.userService.findByEmail(email);
      console.log(`User found: ${user.id}, type: ${user.userType}`);
      
      // Check if email is verified
      if (!user.isEmailVerified) {
        console.log(`Email not verified for user: ${user.id}`);
        // Instead of returning null, throw a specific error
        throw new UnauthorizedException(`Please verify your email before logging in ${process.env.FRONTEND_URL}/resend-verification`);
      }
      
      // Use direct bcrypt comparison for maximum reliability
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log(`Password valid: ${isPasswordValid}`);
      
      if (isPasswordValid) {
        const { password, ...result } = user.toJSON();
        return result;
      }
      
      return null;
    } catch (error) {
      console.error(`Error validating user: ${error.message}`);
      // Re-throw UnauthorizedException with our custom message
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Find a user by email
   */
  async findUserByEmail(email: string) {
    try {
      return await this.userService.findByEmail(email);
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Reset a user's password
   */
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userService.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the user's password
    user.password = hashedPassword;
    await user.save();
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenRecord = await this.tokenService.findOne({
      token,
      type: 'email_verification',
    });

    if (!tokenRecord) {
      throw new Error('Token not found');
    }

    if (tokenRecord.used) {
      throw new Error('Token already used');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new Error('Token expired');
    }

    // Mark token as used
    await this.tokenService.update(tokenRecord.id, { used: true });

    // Update user's email verification status
    const user = await this.userService.findById(tokenRecord.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update user status to ACTIVE if it was INACTIVE
    let updateData: any = { 
      isEmailVerified: true 
    };
    
    // If user status is INACTIVE, change it to ACTIVE
    if (user.status === 'inactive') {
      updateData.status = 'active';
    }
    
    // Update the user record
    await this.userService.update(tokenRecord.userId, updateData);
    
    console.log(`User ${tokenRecord.userId} email verified and status updated to active`);
  }
} 