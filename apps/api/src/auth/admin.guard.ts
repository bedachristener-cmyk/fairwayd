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

export function isFairwaydAdmin(user: any): boolean {
  const userId = String(user?.userId ?? user?.id ?? user?.sub ?? '').trim().toLowerCase();
  const handle = String(user?.handle ?? '').trim().toLowerCase();
  const ids = parseAllowlist(process.env.FAIRWAYD_ADMIN_USER_IDS);
  const handles = parseAllowlist(process.env.FAIRWAYD_ADMIN_HANDLES);
  return Boolean((userId && ids.has(userId)) || (handle && handles.has(handle)));
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (isFairwaydAdmin(context.switchToHttp().getRequest()?.user)) return true;
    throw new ForbiddenException('Admin access required');
  }
}
