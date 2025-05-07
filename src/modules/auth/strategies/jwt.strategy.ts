import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
    
    const secret = configService.get<string>('JWT_SECRET');
    console.log('JWT Secret (first 4 chars):', secret ? secret.substring(0, 4) : 'undefined');
  }

  async validate(payload: any) {
    console.log('JWT Strategy - Validating payload:', payload);
    
    try {
      const user = await this.userService.findById(payload.sub);
      
      if (!user) {
        console.error(`User not found for ID: ${payload.sub}`);
        throw new UnauthorizedException('User not found');
      }
      
      // Return a user object with the properties needed by controllers
      return {
        sub: user.id,
        email: user.email,
        userType: user.userType,
        isAdmin: user.userType === 'admin'
      };
    } catch (error) {
      console.error(`Error validating JWT payload: ${error.message}`);
      throw error;
    }
  }
} 