import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FollowsService } from './follows.service';

@ApiTags('follows')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('follows')
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Get('requests/count')
  async requestsCount(@Req() req: any) {
    const userId = req.user.userId;
    const count = await this.follows.countPendingRequests(userId);
    return { count };
  }

  @Get('requests')
  async listRequests(@Req() req: any) {
    const userId = req.user.userId;
    return this.follows.listPendingRequests(userId);
  }

  // Send a follow request to target userId
  @Post(':userId')
  async requestFollow(@Req() req: any, @Param('userId') userId: string) {
    const me = req.user.userId;
    return this.follows.requestFollow(me, userId);
  }

  @Post('requests/:id/accept')
  async accept(@Req() req: any, @Param('id') id: string) {
    const me = req.user.userId;
    return this.follows.acceptRequest(me, id);
  }

  @Delete('requests/:id')
  async decline(@Req() req: any, @Param('id') id: string) {
    const me = req.user.userId;
    return this.follows.declineRequest(me, id);
  }
}
