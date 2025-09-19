import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationType } from './schemas/notification.schema';
import { User, UserRole } from '../users/schemas/user.schema';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsGateway: NotificationsGateway,
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService,
  ) {}

  async createAndSendNotification(data: {
    type: NotificationType;
    title: string;
    message: string;
    senderId?: string;
    relatedEntity?: string;
    relatedEntityId?: string;
    projectId?: string; // For project-related notifications
    recipientIds?: string[]; // Specific recipients
  }) {
    let recipients: string[] = [];

    if (data.recipientIds && data.recipientIds.length > 0) {
      recipients = data.recipientIds;
    } else if (data.projectId) {
      const project = await this.projectsService.findById(data.projectId, {
        _id: '',
        email: '',
        role: UserRole.ADMIN,
      }); // Admin context to fetch project
      if (project) {
        recipients = [
          (project.projectManager._id as Types.ObjectId).toString(),
          ...project.teamMembers.map((member) =>
            (member._id as Types.ObjectId).toString(),
          ),
        ];
        // Add admin to recipients if not already there
        const adminUsers = await this.usersService.findAdmins();
        adminUsers.forEach((admin) => {
          if (!recipients.includes((admin._id as Types.ObjectId).toString())) {
            recipients.push((admin._id as Types.ObjectId).toString());
          }
        });
      }
    } else {
      // Default to all admins if no specific project or recipients
      const adminUsers = await this.usersService.findAdmins();
      recipients = adminUsers.map((admin) =>
        (admin._id as Types.ObjectId).toString(),
      );
    }

    // Ensure unique recipients
    recipients = [...new Set(recipients)];

    for (const recipientId of recipients) {
      const newNotification = new this.notificationModel({
        type: data.type,
        title: data.title,
        message: data.message,
        recipient: recipientId,
        sender: data.senderId,
        relatedEntity: data.relatedEntity,
        relatedEntityId: data.relatedEntityId,
      });
      await newNotification.save();
      this.notificationsGateway.sendToUser(recipientId, 'notification', {
        message: data.message,
        type: data.type,
        title: data.title,
      });
    }
  }

  async sendNotificationToUser(
    userId: string,
    data: {
      message: string;
      type?: NotificationType;
      sender?: User;
      relatedEntity?: string;
      relatedEntityId?: string;
    },
  ) {
    // This method will now primarily be used by createAndSendNotification
    // or for very specific direct user notifications.
    // The saving to DB and sending via gateway logic is already here.
    const newNotification = new this.notificationModel({
      type: data.type || NotificationType.TASK_UPDATED,
      title: 'Personal Notification',
      message: data.message,
      recipient: userId,
      sender: data.sender,
      relatedEntity: data.relatedEntity,
      relatedEntityId: data.relatedEntityId,
    });
    await newNotification.save();

    this.notificationsGateway.sendToUser(userId, 'notification', data);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return this.notificationModel
      .find({ recipient: userId, isRead: false })
      .exec();
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: notificationId, recipient: userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true },
      )
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found or already read');
    }
    return notification;
  }
}
