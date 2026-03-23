import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // Wenn Token ungültig → nicht blockieren, einfach keinen User setzen
    if (err || !user) {
      return null;
    }
    return user;
  }
}
