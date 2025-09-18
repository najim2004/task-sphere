import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext): unknown {
    const client: Socket = context.switchToWs().getClient();
    const cookie = client.handshake.headers.cookie || '';
    const authToken = cookie
      .split('; ')
      .find((c) => c.startsWith('jwt='))
      ?.split('=')[1];

    // Return a request-like object that the JwtStrategy can understand
    return {
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    };
  }
}
