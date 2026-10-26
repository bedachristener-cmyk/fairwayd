import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function parseAllowlist(value: string | undefined) {
  return new Set(
    String(value ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isLegacyAdmin(user: any): boolean {
  const userId = String(user?.userId ?? user?.id ?? user?.sub ?? '').trim().toLowerCase();
  const handle = String(user?.handle ?? '').trim().toLowerCase();
  const ids = parseAllowlist(process.env.FAIRWAYD_ADMIN_USER_IDS);
  const handles = parseAllowlist(process.env.FAIRWAYD_ADMIN_HANDLES);
  return Boolean((userId && ids.has(userId)) || (handle && handles.has(handle)));
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest()?.user;
    const userId = user?.userId ?? user?.id ?? user?.sub;
    if (userId) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: String(userId) },
        select: { id: true, handle: true, adminRole: true },
      });
      if (dbUser && (dbUser.adminRole === 'ADMIN' ||
        (dbUser.adminRole === null && isLegacyAdmin(dbUser)))) return true;
    }
    throw new ForbiddenException('Admin access required');
  }
}
