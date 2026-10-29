import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min, Max } from "class-validator";

export class CreateCourseDto {
  @ApiProperty({ example: "Golf Club Crans-sur-Sierre" })
  @IsString()
  name: string;

  @ApiProperty({ example: "Crans-Montana", required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: "3963", required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ example: "Valais", required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ example: "CH", description: "CH | DE | AT" })
  @IsString()
  country: string;

  @ApiProperty({ example: 46.3075 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 7.4789 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon: number;
}
