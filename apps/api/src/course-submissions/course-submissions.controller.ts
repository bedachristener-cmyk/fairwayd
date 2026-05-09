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
import { memoryStorage } from 'multer';
import { uploadToR2 } from '../storage/r2.service';
import { CourseSubmissionsService } from './course-submissions.service';

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
      storage: memoryStorage(),
      fileFilter: courseSubmissionImageFileFilter,
      limits: {
        files: maxCourseSubmissionImages,
        fileSize: maxCourseSubmissionImageSize,
      },
    }),
  )
  async create(
    @Body() body: any,
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    const userId = req.user?.userId ?? req.user?.id ?? req.user?.sub;
    const images: {
      url: string;
      path: string;
      originalName: string;
      mimeType: string;
      size: number;
    }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = (file.mimetype?.split('/')[1] || 'bin').replace(
        /[^a-z0-9]/gi,
        '',
      );
      const key = `course-submissions/${userId || 'anonymous'}-${Date.now()}-${i}.${ext}`;
      const url = await uploadToR2(
        key,
        file.buffer,
        file.mimetype || 'application/octet-stream',
      );

      images.push({
        url,
        path: key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });
    }

    return this.courseSubmissionsService.create({
      ...body,
      images,
      submittedByUserId: userId,
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
