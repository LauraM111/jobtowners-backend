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
    // Log the payload for debugging
    console.log('JWT Payload:', payload);
    
    const user = await this.userService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    // Return the user ID as 'sub' to match what's stored in the company's createdBy field
    return { 
      sub: payload.sub, 
      email: payload.email,
      role: payload.role,
    };
  }
} 