import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  TripItemCostMode,
  TripItemExpenseType,
  TripItemType,
  TripItemVisibility,
} from '@prisma/client';

export class CreateTripItemDto {
  @IsEnum(TripItemType)
  type!: TripItemType;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  date!: string;

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
  departureFromHotelTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roundDurationMinutes?: number;

  @IsOptional()
  @IsString()
  returnToHotel?: string;

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
  greenFee?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeGreenFeeInSplit?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeCaddyFeeInSplit?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeCartFeeInSplit?: boolean;

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
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsEnum(TripItemCostMode)
  costMode?: TripItemCostMode;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  exchangeRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseAmount?: number;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  paidByMemberId?: string;

  @IsOptional()
  @IsEnum(TripItemExpenseType)
  expenseType?: TripItemExpenseType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantMemberIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantUserIds?: string[];
  @IsOptional()
  @IsEnum(TripItemVisibility)
  visibility?: TripItemVisibility;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibleToMemberIds?: string[];
}
