import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsLatitude, IsLongitude, Min } from "class-validator";

export class NearbyQueryDto {
  @ApiProperty({ example: 47.5596 })
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 7.5886 })
  @Type(() => Number)
  @IsLongitude()
  lon!: number;

  @ApiProperty({
    example: 50000,
    description: "Radius in meters",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  radiusM!: number;
}
