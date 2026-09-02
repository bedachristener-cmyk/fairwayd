import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get()
  list() {
    return this.feedbackService.list();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body()
    body: {
      message?: string;
      category?: string;
      url?: string;
      device?: string;
      userAgent?: string;
    },
    @Req() req: any,
  ) {
    return this.feedbackService.create({
      message: body?.message,
      category: body?.category,
      url: body?.url,
      device: body?.device,
      userAgent: body?.userAgent,
      userId: req.user?.sub,
    });
  }
}
