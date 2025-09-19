import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from 'src/shared/websocket/ws-jwt.guard';
import { UserPayload } from 'src/shared/interfaces/user-payload.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseGuards(WsJwtGuard)
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, string>();

  handleConnection(client: Socket & { user: UserPayload }) {
    const user = client.user;
    if (user) {
      this.userSocketMap.set(user._id, client.id);
      console.log(`Client connected: ${client.id} for user: ${user._id}`);
    }
  }

  handleDisconnect(client: Socket & { user: UserPayload }) {
    const user = client.user;
    if (user) {
      this.userSocketMap.delete(user._id);
      console.log(`Client disconnected: ${client.id} for user: ${user._id}`);
    }
  }

  @SubscribeMessage('joinProject')
  handleJoinProject(client: Socket, projectId: string): void {
    void client.join(projectId);
    console.log(`Client ${client.id} joined project room: ${projectId}`);
  }

  sendToProject<T>(projectId: string, event: string, data: T) {
    void this.server.to(projectId).emit(event, data);
  }

  sendToUser<T>(userId: string, event: string, data: T) {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      void this.server.to(socketId).emit(event, data);
    }
  }
}
