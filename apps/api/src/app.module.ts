import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { CoursesModule } from "./courses/courses.module";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { PostsModule } from "./posts/posts.module";
import { FeedModule } from "./feed/feed.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    AuthModule,
    PrismaModule,
    CoursesModule,
	PostsModule,
	FeedModule,
  ],
})
export class AppModule {}


