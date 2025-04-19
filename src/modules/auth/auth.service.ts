import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { UserStatus } from '../user/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials and return JWT token
   */
  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.userService.findByEmail(email);
      
      // Check if password matches
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return null;
      }
      
      // Check if email is verified
      if (!user.emailVerified) {
        throw new UnauthorizedException('Email not verified. Please verify your email before logging in.');
      }
      
      // Check if user is active
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Your account is not active. Please contact support.');
      }
      
      const { password: _, ...result } = user.toJSON();
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      return null;
    }
  }
} 