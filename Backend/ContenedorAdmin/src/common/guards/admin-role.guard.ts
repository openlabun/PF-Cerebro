import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { RobleRequest } from './roble-auth.guard';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RobleRequest>();
    const role = String(req?.robleUser?.role ?? '').trim().toLowerCase();
    if (role !== 'admin') {
      throw new ForbiddenException(
        'La cuenta autenticada no tiene permisos de administrador.',
      );
    }

    return true;
  }
}
