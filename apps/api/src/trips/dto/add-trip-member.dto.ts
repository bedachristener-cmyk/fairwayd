import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TripRole } from '@prisma/client';

export class AddTripMemberDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsEnum(TripRole)
  role?: TripRole;
}
