import { IsEnum } from 'class-validator';
import { TripRole } from '@prisma/client';

export class UpdateTripMemberDto {
  @IsEnum(TripRole)
  role!: TripRole;
}
