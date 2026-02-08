import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

type JwtPayload = {
  sub?: string;
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
    });
  }

  async validate(payload: JwtPayload) {
    const userId = payload?.sub;
    if (!userId) throw new UnauthorizedException('Invalid token');

    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    return { userId: user.id, handle: user.handle };
  }
}
