import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // 👈 DAS HINZUFÜGEN
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { PostsService } from './posts.service';
import { Visibility } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { uploadToR2 } from '../storage/r2.service';

type CreatePostBody = {
  courseId: string;
  content: string;
  visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
};

type CreateCommentBody = {
  content: string;
  parentId?: string;
};

type UpdatePostBody = {
  content?: string;
  visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
};

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get('feed')
  async feed(
    @Req() req: any,
    @Query('take') takeStr?: string,
    @Query('cursor') cursor?: string,
  ) {
    const take = takeStr ? Number(takeStr) : undefined;
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.posts.getPublicFeed({ take, cursor, userId });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('course/:courseId')
  async byCourse(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Query('take') takeStr?: string,
    @Query('cursor') cursor?: string,
  ) {
    const take = takeStr ? Number(takeStr) : undefined;
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.posts.getPostsByCourse({ courseId, take, cursor, userId });
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
  @Patch(':id')
  async updatePost(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: UpdatePostBody,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.posts.updatePost(id, userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async deletePost(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.posts.deletePost(id, userId);
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
