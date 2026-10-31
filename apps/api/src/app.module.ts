import { EntryGuidesModule } from './entry-guides/entry-guides.module';
import { ModerationModule } from './moderation/moderation.module';
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
import { RatingsModule } from './ratings/ratings.module';
import { CourseSubmissionsModule } from './course-submissions/course-submissions.module';
import { TripsModule } from './trips/trips.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FxModule } from './fx/fx.module';
import { PostCollectionsModule } from './post-collections/post-collections.module';
import { GolfServicesModule } from './golf-services/golf-services.module';
import { SafetyModule } from './safety/safety.module';
import { ReadinessService } from './runtime/readiness.service';

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
    EntryGuidesModule,
    RatingsModule,
    CourseSubmissionsModule,
    TripsModule,
    NotificationsModule,
    FxModule,
    PostCollectionsModule,
    GolfServicesModule,
    SafetyModule,
    ModerationModule,
  ],
  controllers: [AppController],
  providers: [AppService, ReadinessService],
})
export class AppModule {}
