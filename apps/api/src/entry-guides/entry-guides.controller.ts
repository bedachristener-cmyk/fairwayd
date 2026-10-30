import { Body, Controller, Get, Header, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { EntryGuidesService } from './entry-guides.service';

@Controller('entry-guides')
export class EntryGuidesController {
  constructor(private readonly service: EntryGuidesService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  list() { return this.service.list(); }
  @Get(':countryCode/admin')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Header('Cache-Control', 'no-store')
  adminGet(@Param('countryCode') code: string) { return this.service.adminGet(code); }
  @Patch(':countryCode')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Header('Cache-Control', 'no-store')
  save(@Param('countryCode') code: string, @Body() body: unknown, @Req() req: any) { return this.service.save(code, body, req.user.id ?? req.user.sub); }
}
