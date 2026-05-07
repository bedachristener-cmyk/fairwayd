import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CourseSubmissionsService } from './course-submissions.service';

@Controller('course-submissions')
export class CourseSubmissionsController {
  constructor(
    private readonly courseSubmissionsService: CourseSubmissionsService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.courseSubmissionsService.create({
      ...body,
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
}
