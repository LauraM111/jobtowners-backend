import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
    
    const secret = configService.get<string>('JWT_SECRET');
    console.log('JWT Secret (first 4 chars):', secret ? secret.substring(0, 4) : 'undefined');
  }

  async validate(request, payload: any) {
    
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
} 