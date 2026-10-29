import { PendingPostsService } from './pending-posts.service';
import { Res } from '@nestjs/common';
import type { Response } from 'express';
import { Optional } from '@nestjs/common';
import { ModerationService, requireImageCheck, requireTextCheck, imageMime } from '../moderation/moderation.service';
import {
  BadRequestException,
  ConflictException,
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
  UploadedFiles,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // 👈 DAS HINZUFÜGEN
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { PostsService } from './posts.service';
import { Visibility } from '@prisma/client';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { uploadToR2, deleteStoredUpload } from '../storage/r2.service';
import { extname } from 'path';
import { randomUUID } from 'crypto';

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
  retainedImageIds?: unknown;
  expectedUpdatedAt?: string;
  content?: string;
  visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  courseId?: string;
};

type UpdateCommentBody = {
  content?: string;
};

function safeImageExt(original: string, mimeType?: string) {
  const ext = extname(original || '').toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
    return ext;
  }

  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';

  return '';
}

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService, @Optional() private readonly moderation?: ModerationService, @Optional() private readonly pendingPosts?: PendingPostsService) {}

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
  @Patch('comments/:id')
  async updateComment(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: UpdateCommentBody,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.posts.updateComment(id, userId, body?.content ?? '');
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }], {
    storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 5 },
    fileFilter: (_req, file, cb) => { if (!safeImageExt(file.originalname, file.mimetype)) return cb(new BadRequestException('Only jpg/jpeg/png/webp allowed') as any, false); cb(null, true); },
  }))
  async updatePost(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: UpdatePostBody,
    @UploadedFiles() files?: { images?: Express.Multer.File[] },
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    const images = files?.images ?? [];
    const plan = await this.posts.preparePostImages(id, userId, body?.retainedImageIds, images.length);
    if (body?.expectedUpdatedAt !== undefined) {
      const expected = new Date(body.expectedUpdatedAt);
      if (!Number.isFinite(expected.getTime())) throw new BadRequestException('Invalid post version');
      if (expected.getTime() !== plan.post.updatedAt.getTime()) throw new ConflictException('The post changed. Reload and try again.');
    }
    const text = typeof body?.content === 'string' ? body.content.trim() : plan.post.content;
    if (!text && plan.keptIds.length + images.length === 0) throw new BadRequestException('A post needs text or at least one image');
    if (typeof body?.content === 'string') await requireTextCheck(this.moderation, userId, 'POST_TEXT', text);
    // Validate and moderate every replacement before any public upload.
    for (const file of images) {
      if (imageMime(file.buffer) !== file.mimetype) throw new BadRequestException('Image format does not match its file type');
      await requireImageCheck(this.moderation, userId, 'POST_IMAGE', file);
    }
    const urls: string[] = [];
    try {
      for (const file of images) {
        const key = `posts/${userId}-${randomUUID()}${safeImageExt(file.originalname, file.mimetype)}`;
        urls.push(await uploadToR2(key, file.buffer, file.mimetype));
      }
      return await this.posts.updatePost(id, userId, body, { urls, expectedUpdatedAt: plan.post.updatedAt, textChecked: true });
    } catch (error) {
      await Promise.allSettled(urls.map(url => deleteStoredUpload(url)));
      throw error;
    }
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
    FileFieldsInterceptor([
      { name: 'images', maxCount: 5 },
      { name: 'image', maxCount: 1 },
    ], {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = safeImageExt(file.originalname, file.mimetype);
        if (!ext) {
          cb(
            new BadRequestException('Only jpg/jpeg/png/webp allowed') as any,
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @Req() req: any,
    @Body() body: CreatePostBody,
    @UploadedFiles()
    files?: {
      images?: Express.Multer.File[];
      image?: Express.Multer.File[];
    },
    @Res({ passthrough: true }) response?: Response,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;

    const uploadedImages = [
      ...(files?.images ?? []),
      ...(files?.image ?? []),
    ].slice(0, 6);

    if (uploadedImages.length > 5) {
      throw new BadRequestException('Maximum 5 images per post');
    }

    if (this.pendingPosts) {
      const result = await this.pendingPosts.submit(userId, body, uploadedImages);
      if ('status' in result && result.status === 'PENDING_REVIEW') response?.status(202);
      return result;
    }

    await requireTextCheck(this.moderation, userId, 'POST_TEXT', body?.content || '');
    for (const file of uploadedImages) await requireImageCheck(this.moderation, userId, 'POST_IMAGE', file);
    const imageUrls: string[] = [];

    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const ext = safeImageExt(image.originalname, image.mimetype) || '.jpg';
      const key = `posts/${userId}-${Date.now()}-${i}${ext}`;
      const imageUrl = await uploadToR2(
        key,
        image.buffer,
        image.mimetype || 'application/octet-stream',
      );
      imageUrls.push(imageUrl);
    }

    return this.posts.createPost(userId, body, imageUrls);
  }
}
