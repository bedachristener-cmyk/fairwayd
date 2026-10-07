import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FxService } from './fx.service';

@Controller('fx')
@UseGuards(JwtAuthGuard)
export class FxController {
  constructor(private readonly fxService: FxService) {}

  @Get('rate')
  getRate(@Query('from') from?: string, @Query('to') to?: string) {
    return this.fxService.getReferenceRate(from, to);
  }
}
