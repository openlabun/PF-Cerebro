import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
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
  private readonly logger = new Logger(RobleAuthGuard.name);

  constructor(private readonly robleService: RobleService) {}

  private resolveUserId(user: unknown): string | null {
    if (!user || typeof user !== 'object') {
      return null;
    }

    const userRecord = user as Record<string, unknown>;
    const candidates = [
      userRecord.sub,
      userRecord.id,
      userRecord.userId,
      userRecord.usuarioId,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }

      const normalized = candidate.trim();
      if (
        normalized &&
        normalized !== 'undefined' &&
        normalized !== 'null'
      ) {
        return normalized;
      }
    }

    return null;
  }

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
      const resolvedUserId = this.resolveUserId(tokenInfo.user);

      if (!tokenInfo.valid || !resolvedUserId) {
        this.logger.error(
          `Token payload invalido: valid=${tokenInfo.valid} userKeys=${Object.keys(tokenInfo.user ?? {}).join(',')}`,
        );
        throw new UnauthorizedException('Token payload invalido');
      }

      const typedReq = req as RobleRequest;
      typedReq.accessToken = token;
      typedReq.robleUser = {
        ...tokenInfo.user,
        sub: resolvedUserId,
      };

      if (tokenInfo.user.sub !== resolvedUserId) {
        this.logger.warn(
          `Se normalizo userId desde payload alternativo. subOriginal=${String(tokenInfo.user.sub)} userId=${resolvedUserId}`,
        );
      }

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
