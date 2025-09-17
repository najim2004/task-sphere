import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Project } from 'src/modules/projects/schemas/project.schema';
import { User } from 'src/modules/users/schemas/user.schema';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({ timestamps: true })
export class Task extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Prop({ type: String, enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  project: Project | Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo: User | Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: Date })
  dueDate: Date;

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  progress: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  dependencies: Task[] | Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  dependents: Task[] | Types.ObjectId;

  @Prop({
    type: [
      {
        user: { type: Types.ObjectId, ref: 'User' },
        comment: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  comments: Array<{
    user: Types.ObjectId;
    comment: string;
    createdAt: Date;
  }>;

  @Prop({ type: Number, default: 0 })
  estimatedHours: number;

  @Prop({ type: Number, default: 0 })
  actualHours: number;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Create indexes
TaskSchema.index({ project: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ title: 'text', description: 'text' });
TaskSchema.index({ dueDate: 1 });
