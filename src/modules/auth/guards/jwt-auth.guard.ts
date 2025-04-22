import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // For non-public routes, proceed with JWT validation
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Add logging to debug
    console.log('JWT Auth Error:', err);
    console.log('JWT Auth Info:', info);
    console.log('JWT Auth User:', user);
    
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
} 