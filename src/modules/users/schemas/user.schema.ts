import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Document, Types } from 'mongoose';
import { Project } from 'src/modules/projects/schemas/project.schema';
import { Task } from 'src/modules/tasks/schemas/task.schema';

export enum UserRole {
  ADMIN = 'admin',
  PROJECT_MANAGER = 'project_manager',
  TEAM_MEMBER = 'team_member',
  VIEWER = 'viewer',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.TEAM_MEMBER })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  lastLogin: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Project' }], default: [] })
  assignedProjects: Project[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  assignedTasks: Task[];
}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);

// Pre-save hook to hash password
UserSchema.pre<UserDocument>('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Create indexes (email uniqueness is already handled by @Prop unique: true)
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
