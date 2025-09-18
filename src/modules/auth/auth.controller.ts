import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  Get,
  Res,
} from '@nestjs/common';
import { AuthService, JwtPayload } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { type Response } from 'express';
import { UserPayload } from 'src/shared/interfaces/user-payload.interface';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/shared/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return await this.authService.register(createUserDto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(
    @Body() loginUserDto: LoginUserDto,
    @Request() req: { user: JwtPayload },
    @Res({ passthrough: true }) response: Response,
  ): { message: string } {
    const { access_token } = this.authService.login(req.user);
    response.cookie('jwt', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });
    return { message: 'Login successful' } as { message: string };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response): { message: string } {
    response.clearCookie('jwt');
    return { message: 'Logout successful' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: { user: UserPayload }) {
    return req.user;
  }
}
