import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthenticationError } from '../application/errors';
import { SessionClaims, verifySession } from '../application/session-token';

export const PUBLIC_ROUTE_KEY = 'fieldrelay:public-route';

// Marks a route as reachable without a session. Every use is a deliberate hole
// in the boundary, so each one carries a reason at the call site:
//   - /health              : liveness must work before anyone can sign in
//   - /api/v1/auth/session : issuing a session cannot require a session
//   - provider callbacks   : authenticated by HMAC signature instead
//   - CALL-E webhook       : authenticated by its URL token instead
export const PublicRoute = (): MethodDecorator & ClassDecorator =>
  SetMetadata(PUBLIC_ROUTE_KEY, true);

export interface AuthenticatedRequest extends Request {
  principal?: SessionClaims;
}

// Applied globally through APP_GUARD, so a newly added controller is protected
// by default and must opt out explicitly. The failure mode of forgetting to
// think about auth is therefore "locked", not "open".
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AuthenticationError('A bearer session token is required');
    }

    request.principal = verifySession(
      header.slice('Bearer '.length),
      process.env.AUTH_SIGNING_SECRET ?? ''
    );
    return true;
  }
}
