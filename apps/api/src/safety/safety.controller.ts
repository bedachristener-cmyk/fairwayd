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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { SafetyService } from './safety.service';

@ApiTags('safety')
@ApiBearerAuth('jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('safety')
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Get('blocked-users')
  listBlockedUsers(@Req() req: any) {
    return this.safety.listBlockedUsers(req.user?.userId ?? req.user?.id);
  }

  @Post('blocked-users/:userId')
  blockUser(@Req() req: any, @Param('userId') userId: string) {
    return this.safety.blockUser(
      req.user?.userId ?? req.user?.id,
      userId,
    );
  }

  @Delete('blocked-users/:userId')
  unblockUser(@Req() req: any, @Param('userId') userId: string) {
    return this.safety.unblockUser(
      req.user?.userId ?? req.user?.id,
      userId,
    );
  }

  @Post('reports')
  report(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.safety.createReport(
      req.user?.userId ?? req.user?.id,
      body ?? {},
    );
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/reports')
  listReports(@Query('status') status?: string) {
    return this.safety.listReports(status);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('admin/reports/:id')
  updateReport(
    @Param('id') id: string,
    @Body() body: { status?: unknown },
  ) {
    return this.safety.updateReportStatus(id, body?.status);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Delete('admin/reports/:id/target')
  removeReportedTarget(@Param('id') id: string) {
    return this.safety.removeReportedTarget(id);
  }
}
