import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TripRole } from '@prisma/client';

export class AddTripMemberDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsEnum(TripRole)
  role?: TripRole;
}
