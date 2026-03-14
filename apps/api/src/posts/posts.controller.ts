import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PostsService } from './posts.service';
import { Visibility } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { uploadToR2 } from '../storage/r2.service';

type CreatePostBody = {
  courseId: string;
  content: string;
  visibility?: Visibility;
};

function safeFileName(original: string) {
  const ext = extname(original || '').toLowerCase() || '.jpg';
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${id}${ext}`;
}

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  // ✅ PUBLIC FEED (latest posts everywhere)
  @Get('feed')
  async feed(
    @Query('take') takeStr?: string,
    @Query('cursor') cursor?: string,
  ) {
    const take = takeStr ? Number(takeStr) : undefined;
    return this.posts.getPublicFeed({ take, cursor });
  }

  // ✅ PUBLIC: posts for a specific course (used when clicking a golf club)
  @Get('course/:courseId')
  async byCourse(
    @Param('courseId') courseId: string,
    @Query('take') takeStr?: string,
    @Query('cursor') cursor?: string,
  ) {
    const take = takeStr ? Number(takeStr) : undefined;
    return this.posts.getPostsByCourse({ courseId, take, cursor });
  }

  // ✅ PRIVATE: current user's posts
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req: any, @Query('take') takeStr?: string) {
    const take = takeStr ? Number(takeStr) : 50;
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.posts.getMyPosts(userId, take);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/like')
  async like(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.posts.likePost(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/like')
  async unlike(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.posts.unlikePost(id, userId);
  }

  // ✅ PRIVATE: create a post (supports optional image upload)
  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async create(
    @Req() req: any,
    @Body() body: CreatePostBody,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;

    // for multipart/form-data, body fields are strings
    let imageUrl: string | undefined = undefined;

    if (image) {
      const ext = (image.mimetype?.split('/')[1] || 'bin').replace(
        /[^a-z0-9]/gi,
        '',
      );
      const key = `posts/${userId}-${Date.now()}.${ext}`;
      imageUrl = await uploadToR2(
        key,
        image.buffer,
        image.mimetype || 'application/octet-stream',
      );
    }

    return this.posts.createPost(userId, body, imageUrl);
  }
}
