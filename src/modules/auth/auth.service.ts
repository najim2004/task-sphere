import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from 'src/modules/users/schemas/user.schema';
import { Types } from 'mongoose';

export interface JwtPayload {
  email: string;
  _id: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = (await this.usersService.findByEmail(email)) as User;
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException();
    }

    return {
      _id: (user._id as Types.ObjectId).toString(),
      email: user.email,
      role: user.role,
    };
  }

  login(user: { _id: string; email: string; role: string }): {
    access_token: string;
  } {
    const payload: JwtPayload = {
      email: user.email,
      _id: user._id,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      access_token: accessToken,
    };
  }

  async register(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = (await this.usersService.findByEmail(
      createUserDto.email,
    )) as User;
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    const user = await this.usersService.create(createUserDto);
    // Exclude password from the returned user object

    return { ...user.toObject(), password: '' } as User;
  }
}
