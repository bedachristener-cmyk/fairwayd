import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from '../auth/admin.guard';
import { EntryGuidesController } from './entry-guides.controller';
import { EntryGuidesService } from './entry-guides.service';
@Module({ imports: [PrismaModule], controllers: [EntryGuidesController], providers: [EntryGuidesService, AdminGuard] })
export class EntryGuidesModule {}
