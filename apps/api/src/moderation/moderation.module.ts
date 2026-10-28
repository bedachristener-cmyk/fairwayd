import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from '../auth/admin.guard';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
@Global()
@Module({ imports: [PrismaModule], providers: [ModerationService, AdminGuard], controllers: [ModerationController], exports: [ModerationService] })
export class ModerationModule {}
