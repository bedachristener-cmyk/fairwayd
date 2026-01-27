import { Body, Controller, Get, Post, Req, UseGuards, Param } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";

@Controller("posts")
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @UseGuards(AuthGuard("jwt"))
  @Post()
  async create(@Req() req: any, @Body() body: CreatePostDto) {
    return this.posts.create(req.user.userId, body);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("feed")
  async feed(@Req() req: any) {
    return this.posts.feed(req.user.userId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("course/:courseId")
  async forCourse(@Req() req: any, @Param("courseId") courseId: string) {
    return this.posts.forCourse(req.user.userId, courseId);
  }
}


