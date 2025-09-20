import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification[]> {
    const { recipients, ...notificationData } = createNotificationDto;

    const notificationsToCreate = recipients.map((recipientId) => ({
      ...notificationData,
      recipient: recipientId,
    }));

    const createdNotifications = (await this.notificationModel.insertMany(
      notificationsToCreate,
    )) as Notification[];

    for (const notification of createdNotifications) {
      this.notificationsGateway.sendNotificationToUser(
        notification.recipient.toString(),
        notification,
      );
    }

    this.logger.log(
      `Created and sent ${createdNotifications.length} notifications.`,
    );
    return createdNotifications;
  }

  async getUserNotifications(
    userId: string,
    options: { page: number; limit: number } = { page: 1, limit: 20 },
  ): Promise<Notification[]> {
    const { page, limit } = options;
    return this.notificationModel
      .find({ recipient: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationModel.findOne({
      _id: new Types.ObjectId(notificationId),
      recipient: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw new NotFoundException(
        'Notification not found or you do not have permission to access it.',
      );
    }

    if (notification.isRead) {
      return notification;
    }

    notification.isRead = true;
    notification.readAt = new Date();
    return notification.save();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      recipient: new Types.ObjectId(userId),
      isRead: false,
    });
  }
}
