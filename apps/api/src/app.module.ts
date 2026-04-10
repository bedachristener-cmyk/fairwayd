import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CoursesModule } from './courses/courses.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { FeedModule } from './feed/feed.module';
import { UsersModule } from './users/users.module';
import { FollowsModule } from './follows/follows.module';
import { FeedbackModule } from './feedback/feedback.module';
import { DestinationsModule } from './destinations/destinations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    PrismaModule,
    CoursesModule,
    PostsModule,
    FeedModule,
    UsersModule, // ✅ IMPORTANT: register /users routes
    FollowsModule,
    FeedbackModule,
    DestinationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
