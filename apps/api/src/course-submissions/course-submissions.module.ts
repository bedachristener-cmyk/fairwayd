import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { CourseSubmissionsController } from './course-submissions.controller';
import { CourseSubmissionsService } from './course-submissions.service';

@Module({
  imports: [PrismaModule],
  controllers: [CourseSubmissionsController],
  providers: [CourseSubmissionsService, AdminGuard],
})
export class CourseSubmissionsModule {}
