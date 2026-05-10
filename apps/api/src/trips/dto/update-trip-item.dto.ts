import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { TripItemType } from '@prisma/client';

export class UpdateTripItemDto {
  @IsOptional()
  @IsEnum(TripItemType)
  type?: TripItemType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  bookingRef?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  directPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  caddyFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cartFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  providerPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
