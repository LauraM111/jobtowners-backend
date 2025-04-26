import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { UserStatus } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials and return JWT token
   */
  async login(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email,
      role: user.role 
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
    
    // Return both the token and user data
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        // Add any other user fields you want to include
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
      console.log(`User found: ${user.id}, role: ${user.role}`);
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log(`Password valid: ${isPasswordValid}`);
      
      if (isPasswordValid) {
        const { password, ...result } = user.toJSON();
        return result;
      }
      
      return null;
    } catch (error) {
      console.error(`Error validating user: ${error.message}`);
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
  async resetPassword(userId: string, newPassword: string) {
    try {
      // Instead of updating directly, use the UserService
      await this.userService.updatePassword(userId, newPassword);
      return true;
    } catch (error) {
      this.logger.error(`Failed to reset password: ${error.message}`);
      throw new BadRequestException('Failed to reset password');
    }
  }
} 