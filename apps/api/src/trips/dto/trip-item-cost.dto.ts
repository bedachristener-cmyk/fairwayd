import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { TripItemCostMode, TripItemPaymentMode } from '@prisma/client';

export class TripItemCostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

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
  @IsEnum(TripItemCostMode)
  costMode?: TripItemCostMode;

  @IsOptional()
  @IsEnum(TripItemPaymentMode)
  paymentMode?: TripItemPaymentMode;

  @IsOptional()
  @IsString()
  paidByMemberId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantMemberIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantUserIds?: string[];
}
