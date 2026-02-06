import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';

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

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by id' })
  getById(@Param('id') id: string) {
    return this.coursesService.getById(id);
  }
}
