import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Delete,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async findAll() {
    return this.coursesService.findAll();
  }

  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('country') country?: string,
    @Query('region') region?: string,
    @Query('take') take?: string,
  ) {
    return this.coursesService.search({
      q: q ?? '',
      country,
      region,
      take: Math.min(parseInt(take || '20', 10) || 20, 50),
    });
  }

  @Get('in-bounds')
  async inBounds(
    @Query('minLat') minLat?: string,
    @Query('maxLat') maxLat?: string,
    @Query('minLon') minLon?: string,
    @Query('maxLon') maxLon?: string,
    @Query('country') country?: string,
    @Query('region') region?: string,
    @Query('take') take?: string,
  ) {
    return this.coursesService.inBounds({
      minLat: parseFloat(minLat || ''),
      maxLat: parseFloat(maxLat || ''),
      minLon: parseFloat(minLon || ''),
      maxLon: parseFloat(maxLon || ''),
      country,
      region,
      take: Math.min(parseInt(take || '1000', 10) || 1000, 5000),
    });
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find courses near a coordinate' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lon', type: Number })
  @ApiQuery({ name: 'radiusM', required: false, type: Number })
  async nearby(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
    @Query('radiusM') radiusMStr?: string,
  ) {
    const lat = Number(latStr);
    const lon = Number(lonStr);
    const radiusM = radiusMStr ? Number(radiusMStr) : 50000;

    return this.coursesService.findNearby({ lat, lon, radiusM });
  }

  // ------------------------------------------------------------------
  // Current user's followed courses (JWT)
  // IMPORTANT: must be BEFORE @Get(':id')
  // ------------------------------------------------------------------

  @UseGuards(AuthGuard('jwt'))
  @Get('me/following')
  @ApiOperation({ summary: 'List courses current user follows' })
  async myFollowing(@Req() req: any) {
    const userId = req?.user?.userId ?? req?.user?.id;
    if (!userId) return { items: [] };

    const items = await this.coursesService.listFollowedCourses(userId);
    return { items };
  }

  // ------------------------------------------------------------------
  // Course Follow (JWT)
  // ------------------------------------------------------------------

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/following')
  @ApiOperation({ summary: 'Is current user following this course?' })
  async isFollowing(@Req() req: any, @Param('id') courseId: string) {
    const userId = req?.user?.userId ?? req?.user?.id;
    if (!userId) return { following: false };

    const exists = await this.coursesService.getById(courseId);
    if (!exists) throw new NotFoundException('Course not found');

    const following = await this.coursesService.isFollowingCourse(
      userId,
      courseId,
    );
    return { following };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/follow')
  @ApiOperation({ summary: 'Follow a course' })
  async followCourse(@Param('id') courseId: string, @Req() req: any) {
    const userId = req?.user?.userId ?? req?.user?.id;
    await this.coursesService.followCourse(userId, courseId);
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/follow')
  @ApiOperation({ summary: 'Unfollow a course' })
  async unfollowCourse(@Param('id') courseId: string, @Req() req: any) {
    const userId = req?.user?.userId ?? req?.user?.id;
    await this.coursesService.unfollowCourse(userId, courseId);
    return { ok: true };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by id' })
  getById(@Param('id') id: string) {
    return this.coursesService.getById(id);
  }
}
