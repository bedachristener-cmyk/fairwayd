import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";

@Module({
  imports: [PrismaModule, AuthModule, PassportModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
