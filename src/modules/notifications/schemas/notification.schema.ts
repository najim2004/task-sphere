import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum NotificationEntityType {
  TASK = 'task',
  PROJECT = 'project',
  COMMENT = 'comment',
  USER = 'user',
}

class RelatedEntity {
  @Prop({
    type: String,
    enum: Object.values(NotificationEntityType),
    required: true,
  })
  entity: NotificationEntityType;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;
}

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification extends Document {
  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  sender: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(NotificationPriority),
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Boolean, default: false })
  isDelivered: boolean;

  @Prop({ type: Date, default: Date.now })
  sentAt: Date;

  @Prop({ type: Date, default: null })
  readAt: Date;

  @Prop({ type: [RelatedEntity], default: [] })
  relatedEntities: RelatedEntity[];
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index(
  { priority: 1 },
  { partialFilterExpression: { priority: 'HIGH' } },
);
