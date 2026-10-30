import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { PendingChangesService } from './pending-changes.service';
@Controller('safety/admin/pending-changes')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class PendingChangesController {
  constructor(private readonly changes: PendingChangesService) {}
  @Get()
  list(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'private, no-store');
    return this.changes.list();
  }
  @Get(':id/images/:imageId')
  async image(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Res() res: Response,
  ) {
    const image = await this.changes.preview(id, imageId);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.type(image.mimeType).send(image.bytes);
  }
  @Patch(':id')
  decide(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { decision?: unknown },
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'private, no-store');
    return this.changes.decide(
      id,
      req.user?.userId ?? req.user?.id ?? req.user?.sub,
      body.decision,
    );
  }
}
