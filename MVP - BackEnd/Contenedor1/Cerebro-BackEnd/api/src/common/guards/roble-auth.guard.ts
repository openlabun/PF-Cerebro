import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { RobleService } from '../../roble/roble.service';

export interface RobleRequest extends Request {
  accessToken: string;
  robleUser: RobleUserPayload;
}

export interface RobleUserPayload {
  sub: string;
  email: string;
  role?: string;
  dbName?: string;
}

@Injectable()
export class RobleAuthGuard implements CanActivate {
  constructor(private readonly robleService: RobleService) {}

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
      const tokenInfo = await this.robleService.verifyToken(token);

      if (!tokenInfo.valid || !tokenInfo.user?.sub) {
        throw new UnauthorizedException('Token payload inválido');
      }

      const typedReq = req as RobleRequest;
      typedReq.accessToken = token;
      typedReq.robleUser = tokenInfo.user;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
