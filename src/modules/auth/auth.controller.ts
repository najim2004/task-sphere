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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return await this.authService.register(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @Post('login')
  login(
    @Body() loginUserDto: LoginUserDto,
    @Request() req: { user: JwtPayload },
    @Res({ passthrough: true }) response: Response,
  ): { message: string } {
    const { access_token } = this.authService.login(req.user);
    response.cookie('jwt', access_token, { httpOnly: true, secure: true });
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
