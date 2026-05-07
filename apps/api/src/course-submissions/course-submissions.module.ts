import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CourseSubmissionsController } from './course-submissions.controller';
import { CourseSubmissionsService } from './course-submissions.service';

@Module({
  imports: [PrismaModule],
  controllers: [CourseSubmissionsController],
  providers: [CourseSubmissionsService],
})
export class CourseSubmissionsModule {}
