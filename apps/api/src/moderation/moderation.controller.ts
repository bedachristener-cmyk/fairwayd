import { Body, Controller, Get, Param, Patch, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { ModerationService, moderationEnabled } from './moderation.service';

@Controller('safety/admin/moderation')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}
  @Get('status')
  status(@Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'private, no-store'); return { enabled: moderationEnabled(), configured: Boolean(process.env.OPENAI_MODERATION_API_KEY?.trim()) }; }
  @Get()
  async list(@Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'private, no-store'); return this.moderation.list(); }
  @Get(':id/image')
  async image(@Param('id') id: string, @Res() response: Response) {
    const image = await this.moderation.preview(id);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.type(image.mimeType).send(image.bytes);
  }
  @Patch(':id')
  decide(@Param('id') id: string, @Req() req: any, @Body() body: { decision?: unknown }) { return this.moderation.decide(id, req.user?.userId ?? req.user?.id ?? req.user?.sub, body.decision); }
}
