import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateTripDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[A-Z]{2}$/, { each: true })
  entryRequirementCountries?: string[];

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
