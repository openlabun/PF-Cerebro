import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  AuthService,
  type RobleUserPayload,
} from '../../auth/auth.service';

export interface RobleRequest extends Request {
  accessToken: string;
  robleUser: RobleUserPayload;
}

@Injectable()
export class RobleAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException('Empty token');
    }

    const robleUser = await this.authService.authenticate(token);
    const typedReq = req as RobleRequest;
    typedReq.accessToken = token;
    typedReq.robleUser = robleUser;
    return true;
  }
}
