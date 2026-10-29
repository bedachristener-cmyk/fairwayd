import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateCourseDto {
  @ApiProperty({ example: "Golf Club Bad Ragaz" })
  @IsString()
  name: string;

  @ApiProperty({ example: "Bad Ragaz", required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: "7310", required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ example: "SG", required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ example: "CH" })
  @IsString()
  country: string;

  @ApiProperty({ example: 47.0051 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 9.4975 })
  @IsNumber()
  lon: number;
}
