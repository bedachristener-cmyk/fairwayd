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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PostCollectionsService } from './post-collections.service';

type CollectionBody = {
  name?: string;
};

@Controller('post-collections')
@UseGuards(AuthGuard('jwt'))
export class PostCollectionsController {
  constructor(private readonly collections: PostCollectionsService) {}

  private userId(req: any) {
    return req.user?.sub ?? req.user?.id ?? req.user?.userId;
  }

  @Get()
  list(@Req() req: any, @Query('postId') postId?: string) {
    return this.collections.list(this.userId(req), postId);
  }

  @Post()
  create(@Req() req: any, @Body() body: CollectionBody) {
    return this.collections.create(this.userId(req), body?.name);
  }

  @Patch(':id')
  rename(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: CollectionBody,
  ) {
    return this.collections.rename(this.userId(req), id, body?.name);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.collections.remove(this.userId(req), id);
  }

  @Get(':id/posts')
  posts(@Req() req: any, @Param('id') id: string) {
    return this.collections.posts(this.userId(req), id);
  }

  @Post(':id/posts/:postId')
  savePost(
    @Req() req: any,
    @Param('id') id: string,
    @Param('postId') postId: string,
  ) {
    return this.collections.savePost(this.userId(req), id, postId);
  }

  @Delete(':id/posts/:postId')
  removePost(
    @Req() req: any,
    @Param('id') id: string,
    @Param('postId') postId: string,
  ) {
    return this.collections.removePost(this.userId(req), id, postId);
  }
}
