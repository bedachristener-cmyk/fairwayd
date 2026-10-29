import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

function getRequestUserId(req: any) {
  return req.user?.userId ?? req.user?.id ?? req.user?.sub;
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('email-preferences')
  emailPreferences(@Req() req: any) {
    return this.notifications.emailPreferences(getRequestUserId(req));
  }

  @Patch('email-preferences')
  updateEmailPreferences(@Req() req: any, @Body() body: unknown) {
    return this.notifications.updateEmailPreferences(
      getRequestUserId(req),
      body,
    );
  }

  @Get()
  list(@Req() req: any) {
    return this.notifications.listForUser(getRequestUserId(req));
  }

  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.notifications.unreadCount(getRequestUserId(req));
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notifications.markAllRead(getRequestUserId(req));
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.notifications.markRead(getRequestUserId(req), id);
  }
}
