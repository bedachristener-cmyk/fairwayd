import {
  IsEnum,
  IsString,
  IsUUID,
  MinLength,
  IsOptional,
} from 'class-validator';

export enum VisibilityDto {
  FOLLOWERS = 'FOLLOWERS',
  PUBLIC = 'PUBLIC',
}

export class CreatePostDto {
  @IsString()
  courseId!: string; // (später evtl. IsUUID, falls du UUID ids nutzt)

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsEnum(VisibilityDto)
  visibility?: VisibilityDto;
}
