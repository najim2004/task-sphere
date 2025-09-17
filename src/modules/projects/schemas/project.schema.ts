import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Task } from 'src/modules/tasks/schemas/task.schema';
import { User } from 'src/modules/users/schemas/user.schema';

export enum ProjectStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Project extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  projectManager: User | Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  teamMembers: (User | Types.ObjectId)[];

  @Prop({ type: Date })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;

  @Prop({ type: Date })
  deadline: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  tasks: Task[];

  @Prop({ type: Number, default: 0 })
  completionPercentage: number;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Create indexes
ProjectSchema.index({ projectManager: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ name: 'text', description: 'text' });
