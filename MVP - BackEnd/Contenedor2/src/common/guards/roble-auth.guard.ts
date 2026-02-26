import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../../auth/auth.service';
import type { RobleRequest } from '../types/roble-request';

@Injectable()
export class RobleAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      throw new UnauthorizedException('Empty token');
    }

    try {
      const tokenInfo = await this.authService.verifyToken(`Bearer ${token}`);

      const typedReq = req as RobleRequest;
      typedReq.accessToken = token;
      typedReq.robleUser = tokenInfo;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
