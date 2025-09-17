import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schema';

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  PROJECT_ASSIGNED = 'project_assigned',
  PROJECT_UPDATED = 'project_updated',
  COMMENT_ADDED = 'comment_added',
  DEADLINE_APPROACHING = 'deadline_approaching',
}

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: User;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  sender: User;

  @Prop({ type: String })
  relatedEntity: string; // 'task', 'project', 'user'

  @Prop({ type: Types.ObjectId })
  relatedEntityId: Types.ObjectId;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  isDelivered: boolean;

  @Prop({ type: Date, default: Date.now })
  sentAt: Date;

  @Prop({ type: Date })
  readAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Create indexes
NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ type: 1 });
