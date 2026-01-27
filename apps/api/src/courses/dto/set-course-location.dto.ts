import { ApiProperty } from "@nestjs/swagger";
import { IsLatitude, IsLongitude } from "class-validator";

export class SetCourseLocationDto {
  @ApiProperty({ example: 47.5596 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 7.5886 })
  @IsLongitude()
  lon!: number;
}
