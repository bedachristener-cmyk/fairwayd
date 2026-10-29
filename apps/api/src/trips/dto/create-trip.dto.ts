import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTripDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  baseCurrency?: string;
}
