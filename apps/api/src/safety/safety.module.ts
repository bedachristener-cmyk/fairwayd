import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';

@Module({
  imports: [PrismaModule],
  controllers: [SafetyController],
  providers: [SafetyService, AdminGuard],
  exports: [SafetyService],
})
export class SafetyModule {}
