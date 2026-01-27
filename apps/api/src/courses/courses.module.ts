import { Module } from "@nestjs/common";
import { CoursesController } from "./courses.controller";
import { CoursesService } from "./courses.service";

import { PrismaModule } from "../prisma/prisma.module"; // Pfad ggf. anpassen
import { CoursesImportController } from "./import/courses-import.controller";
import { CoursesImportService } from "./import/courses-import.service";

@Module({
  imports: [PrismaModule],
  controllers: [CoursesController, CoursesImportController],
  providers: [CoursesService, CoursesImportService],
})
export class CoursesModule {}
