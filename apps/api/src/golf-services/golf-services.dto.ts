import { Type, Transform } from 'class-transformer';
import {
  IsIn, IsInt, IsNumber, IsOptional, Matches, Max, Min,
} from 'class-validator';
import { GolfServiceCategory } from '@prisma/client';

export const GOLF_SERVICES_RADII_KM = [10, 25, 50, 100] as const;

export class NearbyGolfServicesQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @Type(() => Number)
  @IsIn(GOLF_SERVICES_RADII_KM)
  radiusKm: number = 25;

  @IsOptional()
  @IsIn(Object.values(GolfServiceCategory))
  category?: GolfServiceCategory;

  // Optional: intentionally omit for searches across national borders.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{2}$/)
  country?: string;
}

export class GolfServicesRegionQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{2}$/)
  country!: string;

  @IsOptional()
  @Matches(/^.{1,120}$/)
  region?: string;

  @IsOptional()
  @IsIn(Object.values(GolfServiceCategory))
  category?: GolfServiceCategory;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take: number = 50;
}
