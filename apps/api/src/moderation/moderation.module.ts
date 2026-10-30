import { APP_INTERCEPTOR } from '@nestjs/core';
import { PendingChangesService } from './pending-changes.service';
import { PendingChangesController } from './pending-changes.controller';
import { ReviewActionInterceptor } from './review-action.interceptor';
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from '../auth/admin.guard';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
@Global()
@Module({ imports: [PrismaModule], providers: [ModerationService, PendingChangesService, AdminGuard, { provide: APP_INTERCEPTOR, useClass: ReviewActionInterceptor }], controllers: [ModerationController, PendingChangesController], exports: [ModerationService] })
export class ModerationModule {}
