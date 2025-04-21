import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
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
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials and return JWT token
   */
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const payload = { 
      sub: user.id,
      email: user.email,
      role: user.role
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user
    };
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.userService.findByEmail(email);
      
      // Check if password matches
      const isPasswordValid = await user.comparePassword(password);
      
      if (isPasswordValid) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user.toJSON();
        return result;
      }
      
      return null;
    } catch (error) {
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