import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GolfServicesRegionQueryDto, NearbyGolfServicesQueryDto,
} from './golf-services.dto';
import { GolfServicesService } from './golf-services.service';

@ApiTags('golf-services')
@Controller('golf-services')
export class GolfServicesController {
  constructor(private readonly services: GolfServicesService) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Verified golf services near a coordinate; no location saved' })
  nearby(@Query() query: NearbyGolfServicesQueryDto) {
    return this.services.nearby(query);
  }

  @Get()
  @ApiOperation({ summary: 'Verified golf services by country, region and category' })
  byRegion(@Query() query: GolfServicesRegionQueryDto) {
    return this.services.byRegion(query);
  }
}
