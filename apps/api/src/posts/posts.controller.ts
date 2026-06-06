import {
  BadRequestException,
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
import { uploadToR2 } from '../storage/r2.service';
import { extname } from 'path';

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
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;

    const uploadedImages = [
      ...(files?.images ?? []),
      ...(files?.image ?? []),
    ].slice(0, 6);

    if (uploadedImages.length > 5) {
      throw new BadRequestException('Maximum 5 images per post');
    }

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
