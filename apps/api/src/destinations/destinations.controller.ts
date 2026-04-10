import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
}
