import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

function parseAllowlist(value: string | undefined) {
  return new Set(
    String(value ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    const userId = String(user?.userId ?? user?.id ?? user?.sub ?? '')
      .trim()
      .toLowerCase();
    const handle = String(user?.handle ?? '').trim().toLowerCase();

    const allowedIds = parseAllowlist(process.env.FAIRWAYD_ADMIN_USER_IDS);
    const allowedHandles = parseAllowlist(process.env.FAIRWAYD_ADMIN_HANDLES);

    if (
      (userId && allowedIds.has(userId)) ||
      (handle && allowedHandles.has(handle))
    ) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}
