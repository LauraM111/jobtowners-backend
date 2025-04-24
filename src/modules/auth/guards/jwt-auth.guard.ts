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

    // For protected routes, proceed with JWT validation
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context) {
    // Add detailed logging for debugging 
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (err || !user) {
      throw new UnauthorizedException({
        message: 'Invalid token',
        error: err?.message || 'JWT Auth Error',
        info: info?.message ? `JWT Auth Info: ${info.name}: ${info.message}` : null,
        user: !!user
      });
    }
    return user;
  }
} 