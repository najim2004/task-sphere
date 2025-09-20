import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task, TaskSchema } from './schemas/task.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { Trie } from './trie';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    NotificationsModule,
    ProjectsModule, // For permission checking
    AnalyticsModule, // For logging events
  ],
  controllers: [TasksController],
  providers: [TasksService, Trie],
})
export class TasksModule {}
