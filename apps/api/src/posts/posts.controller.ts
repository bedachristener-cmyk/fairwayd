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
import { memoryStorage } from 'multer';
import { uploadToR2 } from '../storage/r2.service';

type CreatePostBody = {
  courseId: string;
  content: string;
  visibility?: Visibility;
};

type CreateCommentBody = {
  content: string;
  parentId?: string;
};

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get('feed')
  async feed(
    @Query('take') takeStr?: string,
    @Query('cursor') cursor?: string,
  ) {
    const take = takeStr ? Number(takeStr) : undefined;
    return this.posts.getPublicFeed({ take, cursor });
  }

  @Get('course/:courseId')
  async byCourse(
    @Param('courseId') courseId: string,
    @Query('take') takeStr?: string,
    @Query('cursor') cursor?: string,
  ) {
    const take = takeStr ? Number(takeStr) : undefined;
    return this.posts.getPostsByCourse({ courseId, take, cursor });
  }

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

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/comments')
  async getComments(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.posts.getComments(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/comments')
  async createComment(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: CreateCommentBody,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.posts.createComment(
      id,
      userId,
      body?.content ?? '',
      body?.parentId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('comments/:id/like')
  async toggleCommentLike(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.posts.toggleCommentLike(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(
    @Req() req: any,
    @Body() body: CreatePostBody,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;

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
