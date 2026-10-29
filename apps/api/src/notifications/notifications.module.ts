import { Module } from '@nestjs/common';
import { MailService } from '../auth/mail.service';
import { NotificationEmailService } from './notification-email.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, MailService, NotificationEmailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
