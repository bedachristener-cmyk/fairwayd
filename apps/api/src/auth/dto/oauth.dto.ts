import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum OAuthProvider {
  GOOGLE = 'GOOGLE',
}

export class OAuthDto {
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @IsString()
  @IsNotEmpty()
  idToken: string;
}
