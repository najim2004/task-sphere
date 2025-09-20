import { UseGuards, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from 'src/shared/websocket/ws-jwt.guard';
import { Notification } from './schemas/notification.schema';

interface AuthenticatedSocket extends Socket {
  user: {
    _id: string;
    email: string;
    role: string;
  };
}

@UseGuards(WsJwtGuard)
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  async handleConnection(client: AuthenticatedSocket) {
    const userId = client.user._id;
    if (userId) {
      await client.join(userId);
      this.logger.log(
        `Client connected: ${client.id}, User ID: ${userId}, Room: ${userId}`,
      );
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendNotificationToUser(userId: string, notification: Notification) {
    this.server.to(userId).emit('newNotification', notification);
    this.logger.log(`Sent notification to user room: ${userId.toString()}`);
  }
}
