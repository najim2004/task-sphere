import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import {
  AnalyticsEvent,
  AnalyticsEventSchema,
} from './schemas/analytics.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema'; // Add this import
import { User, UserSchema } from '../users/schemas/user.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
      { name: Task.name, schema: TaskSchema }, // Add this line
      { name: User.name, schema: UserSchema }, // Add this line
      { name: Project.name, schema: ProjectSchema }, // Add this line
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [ProjectsService, UsersService, AnalyticsService],
  exports: [ProjectsService, UsersService, AnalyticsService], // Export service to be used in other modules
})
export class AnalyticsModule {}
