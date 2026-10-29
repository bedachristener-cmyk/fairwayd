import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RatingsService } from './ratings.service';

type RatingBody = {
  overall: number;
  condition?: number | null;
  layout?: number | null;
  scenery?: number | null;
  value?: number | null;
};

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get(':courseId')
  async getCourseSummary(@Param('courseId') courseId: string) {
    return this.ratingsService.getCourseSummary(courseId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/:courseId')
  async getMyRating(@Param('courseId') courseId: string, @Req() req: any) {
    console.log('ratings/me debug', {
      courseId,
      userId: req.user?.id,
      userSub: req.user?.sub,
      user: req.user,
    });

    return this.ratingsService.getMyRating(req.user.id, courseId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':courseId')
  async upsertRating(
    @Param('courseId') courseId: string,
    @Req() req: any,
    @Body() body: RatingBody,
  ) {
    return this.ratingsService.upsertRating(req.user.id, courseId, {
      overall: body.overall,
      condition: body.condition ?? null,
      layout: body.layout ?? null,
      scenery: body.scenery ?? null,
      value: body.value ?? null,
    });
  }
}
