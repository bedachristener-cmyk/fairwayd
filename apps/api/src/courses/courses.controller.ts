import { Controller, Get, Query, Param } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CoursesService } from "./courses.service";

@ApiTags("courses")
@Controller("courses")
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async findAll() {
    return this.coursesService.findAll();
  }

  @Get("nearby")
  @ApiOperation({ summary: "Find courses near a coordinate" })
  @ApiQuery({ name: "lat", type: Number })
  @ApiQuery({ name: "lon", type: Number })
  @ApiQuery({ name: "radiusM", required: false, type: Number })
  async nearby(
    @Query("lat") latStr: string,
    @Query("lon") lonStr: string,
    @Query("radiusM") radiusMStr?: string
  ) {
    const lat = Number(latStr);
    const lon = Number(lonStr);
    const radiusM = radiusMStr ? Number(radiusMStr) : 50000;

    return this.coursesService.findNearby({ lat, lon, radiusM });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a course by id" })
  getById(@Param("id") id: string) {
    return this.coursesService.getById(id);
  }
}
