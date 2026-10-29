import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

type JwtPayload = {
  sub?: string; // subject (user id)
  userId?: string; // optional, falls du das spaeter so ausstellst
  id?: string; // optional
  handle?: string;
  iat?: number;
  exp?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    cfg: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: cfg.get<string>('JWT_SECRET', 'dev_only_change_me'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    const userId = payload?.userId ?? payload?.id ?? payload?.sub;
    if (!userId) throw new UnauthorizedException('Invalid token');

    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    // Wichtig: wir geben ALLE gaengigen keys zurueck, damit Controller stabil sind
    return {
      userId: user.id,
      id: user.id,
      sub: user.id,
      handle: user.handle,
    };
  }
}
