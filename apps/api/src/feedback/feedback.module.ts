import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, AdminGuard],
})
export class FeedbackModule {}
