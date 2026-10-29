import { PendingPostsService } from './pending-posts.service';
import { PendingPostsController } from './pending-posts.controller';
import { AdminGuard } from '../auth/admin.guard';
import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [PostsController, PendingPostsController],
  providers: [PostsService, PendingPostsService, AdminGuard],
})
export class PostsModule {}
