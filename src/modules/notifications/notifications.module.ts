import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';

import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    forwardRef(() => ProjectsModule),
    forwardRef(() => UsersModule),
  ],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
