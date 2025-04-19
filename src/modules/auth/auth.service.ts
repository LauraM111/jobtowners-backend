import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials and return JWT token
   */
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    const payload = { sub: user.id, email: user.email };
    
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string) {
    try {
      const user = await this.userService.findByEmail(email);
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
      
      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }
} 