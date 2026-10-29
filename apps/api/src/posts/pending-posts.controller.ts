import { Body, Controller, Get, Param, Patch, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { PendingPostsService } from './pending-posts.service';

@Controller('safety/admin/pending-posts')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class PendingPostsController {
  constructor(private readonly posts: PendingPostsService) {}
  @Get()
  list(@Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'private, no-store'); return this.posts.list(); }
  @Get(':id/images/:imageId')
  async preview(@Param('id') id: string, @Param('imageId') imageId: string, @Res() response: Response) {
    const image = await this.posts.preview(id, imageId);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.type(image.mimeType).send(image.bytes);
  }
  @Patch(':id')
  decide(@Param('id') id: string, @Req() req: any, @Body() body: { decision?: unknown }) { return this.posts.decide(id, req.user?.userId ?? req.user?.id ?? req.user?.sub, body.decision); }
}
