import { IsString } from 'class-validator';

export class UpdateUserPreferencesDto {
  @IsString()
  preferredCurrency!: string;
}
