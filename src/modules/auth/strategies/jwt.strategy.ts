import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { UserStatus } from '../../user/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    try {
      const user = await this.userService.findOne(payload.sub);
      
      // Check if user is active
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('User account is not active');
      }
      
      // Return user without password
      const { password, ...result } = user.toJSON();
      return result;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
} 