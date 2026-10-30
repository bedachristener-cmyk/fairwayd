import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, lastValueFrom, Observable } from 'rxjs';
import { REVIEW_ACTION, ReviewAction } from './review-action';
import {
  PendingChangesService,
  reviewRequired,
} from './pending-changes.service';
@Injectable()
export class ReviewActionInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly changes: PendingChangesService,
  ) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<ReviewAction | undefined>(
      REVIEW_ACTION,
      context.getHandler(),
    );
    if (!action) return next.handle();
    return from(this.run(action, context, next));
  }
  private async run(
    action: ReviewAction,
    context: ExecutionContext,
    next: CallHandler,
  ) {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.userId ?? req.user?.id ?? req.user?.sub;
    const target =
      action === 'AVATAR' || action === 'PROFILE'
        ? userId
        : (req.params?.id ?? req.params?.slug ?? '');
    // Snapshot before handling the request, not after another editor might have changed it.
    const snapshot = await this.changes.snapshot(action, target, userId);
    try {
      return await lastValueFrom(next.handle());
    } catch (error) {
      if (!reviewRequired(error)) throw error;
      const files = req.file
        ? [req.file]
        : Array.isArray(req.files)
          ? req.files
          : Object.values(req.files ?? {}).flat();
      const result = await this.changes.capture(
        action,
        target,
        userId,
        req.body ?? {},
        files as Express.Multer.File[],
        snapshot,
      );
      context
        .switchToHttp()
        .getResponse()
        .status(202)
        .setHeader('Cache-Control', 'private, no-store');
      return result;
    }
  }
}
