import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CourseSubmissionsService } from './course-submissions.service';

const courseSubmissionUploadDir = join(
  process.cwd(),
  'uploads',
  'course-submissions',
);
const maxCourseSubmissionImages = 5;
const maxCourseSubmissionImageSize = 5 * 1024 * 1024;

function courseSubmissionImageFileFilter(
  _req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!file.mimetype.startsWith('image/')) {
    return callback(
      new BadRequestException('Only image uploads are allowed'),
      false,
    );
  }

  callback(null, true);
}

@Controller('course-submissions')
export class CourseSubmissionsController {
  constructor(
    private readonly courseSubmissionsService: CourseSubmissionsService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', maxCourseSubmissionImages, {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          mkdirSync(courseSubmissionUploadDir, { recursive: true });
          callback(null, courseSubmissionUploadDir);
        },
        filename: (_req, file, callback) => {
          const safeExt = extname(file.originalname || '').toLowerCase();
          callback(null, `${randomUUID()}${safeExt}`);
        },
      }),
      fileFilter: courseSubmissionImageFileFilter,
      limits: {
        files: maxCourseSubmissionImages,
        fileSize: maxCourseSubmissionImageSize,
      },
    }),
  )
  create(
    @Body() body: any,
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.courseSubmissionsService.create({
      ...body,
      images: files.map((file) => ({
        url: `/uploads/course-submissions/${file.filename}`,
        path: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      })),
      submittedByUserId: req.user?.userId ?? req.user?.id ?? req.user?.sub,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  list(@Query('status') status?: string) {
    return this.courseSubmissionsService.list(status);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.courseSubmissionsService.approve(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.courseSubmissionsService.reject(id);
  }
}
