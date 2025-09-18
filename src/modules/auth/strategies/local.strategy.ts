import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' }); // Use email as the username field
  }

  async validate(email: string, password: string): Promise<JwtPayload> {
    const user = (await this.authService.validateUser(
      email,
      password,
    )) as JwtPayload;
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
