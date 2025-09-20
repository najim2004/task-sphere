import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../../modules/users/users.service';
import { UserPayload } from '../interfaces/user-payload.interface';

type JwtExtractor = (req: Request) => string | null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    const cookieExtractor = (req: Request) =>
      (req?.cookies?.jwt ?? null) as string;
    const bearerExtractor: JwtExtractor =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      ExtractJwt.fromAuthHeaderAsBearerToken() as JwtExtractor;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      jwtFromRequest: (req: Request) =>
        cookieExtractor(req) || bearerExtractor(req),
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: UserPayload) {
    return this.usersService.findById(payload._id);
  }
}
