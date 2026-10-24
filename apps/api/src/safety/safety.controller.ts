import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
}
