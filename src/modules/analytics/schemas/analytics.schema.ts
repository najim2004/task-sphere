import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schema';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

@Schema({ timestamps: true })
export class AnalyticsEvent {
  @Prop({ required: true })
  event: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: User | Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed })
  details: Record<string, any>;
}

export const AnalyticsEventSchema =
  SchemaFactory.createForClass(AnalyticsEvent);
