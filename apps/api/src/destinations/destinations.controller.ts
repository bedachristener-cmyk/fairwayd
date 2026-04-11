import {
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DestinationsService } from './destinations.service';

@ApiTags('destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Get()
  findAll() {
    return this.destinationsService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.destinationsService.findBySlug(slug);
  }

  @Get(':slug/posts')
  getPosts(@Param('slug') slug: string) {
    return this.destinationsService.getPostsBySlug(slug);
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
