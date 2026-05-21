import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DestinationsService } from './destinations.service';

@ApiTags('destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.destinationsService.findAll(userId);
  }

  @Get('discovery/tips')
  getDiscoveryTips(@Req() req: any) {
    const rawTake = req.query?.take;
    return this.destinationsService.getDiscoveryTips(rawTake);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug/tips')
  getTips(@Param('slug') slug: string, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.destinationsService.getTipsBySlug(slug, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a community tip for a destination' })
  @Post(':slug/tips')
  createTip(
    @Param('slug') slug: string,
    @Req() req: any,
    @Body() body: { text?: string },
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.destinationsService.createTip(slug, userId, body?.text ?? '');
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a destination community tip as useful' })
  @Post(':slug/tips/:tipId/helpful')
  markTipHelpful(
    @Param('slug') slug: string,
    @Param('tipId') tipId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.destinationsService.markTipHelpful(slug, tipId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a useful mark from a destination community tip' })
  @Delete(':slug/tips/:tipId/helpful')
  unmarkTipHelpful(
    @Param('slug') slug: string,
    @Param('tipId') tipId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.destinationsService.unmarkTipHelpful(slug, tipId, userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug/posts')
  getPosts(@Param('slug') slug: string, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.destinationsService.getPostsBySlug(slug, userId);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.destinationsService.findBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a destination' })
  @Post(':slug/follow')
  async follow(@Param('slug') slug: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.destinationsService.followDestination(userId, slug);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a destination' })
  @Delete(':slug/follow')
  async unfollow(@Param('slug') slug: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.destinationsService.unfollowDestination(userId, slug);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get follow status for a destination' })
  @Get(':slug/follow-status')
  async getFollowStatus(@Param('slug') slug: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.destinationsService.getFollowStatus(userId, slug);
  }
}
