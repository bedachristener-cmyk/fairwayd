import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getFeed(@Req() req: any) {
    return this.feed.getCourseFeed(req.user.userId);
  }
}
