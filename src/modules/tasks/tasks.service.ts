import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task } from './schemas/task.schema';
import { UserPayload } from 'src/shared/interfaces/user-payload.interface';
import { ProjectsService } from '../projects/projects.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationEntityType,
  NotificationPriority,
} from '../notifications/schemas/notification.schema';
import { Trie } from './trie';

@Injectable()
export class TasksService implements OnModuleInit {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    private readonly projectsService: ProjectsService,
    private readonly notificationsService: NotificationsService,
    private readonly trie: Trie,
  ) {}

  async onModuleInit() {
    const tasks = await this.taskModel.find({}, 'title').exec();
    for (const task of tasks) {
      this.trie.insert(task.title);
    }
  }

  async create(createTaskDto: CreateTaskDto, user: UserPayload): Promise<Task> {
    const project = await this.projectsService.findById(
      createTaskDto.projectId,
      user,
    );
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const { projectId, ...restOfDto } = createTaskDto;
    const task = new this.taskModel({
      ...restOfDto,
      project: projectId,
      createdBy: user._id,
    });
    await task.save();

    this.trie.insert(task.title);

    await this.notificationsService.createNotification({
      type: 'NEW_TASK',
      title: 'New Task Created',
      message: `A new task '${task.title}' has been added to project '${project.name}'.`,
      recipients: [project.projectManager as Types.ObjectId],
      sender: new Types.ObjectId(user._id),
      priority: NotificationPriority.MEDIUM,
      relatedEntities: [
        {
          entity: NotificationEntityType.PROJECT,
          entityId: project._id as Types.ObjectId,
        },
        {
          entity: NotificationEntityType.TASK,
          entityId: task._id as Types.ObjectId,
        },
      ],
    });

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    user: UserPayload,
  ): Promise<Task> {
    const task = await this.taskModel.findById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const project = await this.projectsService.findById(
      (task.project as Types.ObjectId).toString(),
      user,
    );
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const oldAssignee = task.assignedTo as Types.ObjectId;
    const newAssignee = updateTaskDto.assigneeId;
    const isNewlyAssigned =
      newAssignee && oldAssignee?.toString() !== newAssignee.toString();

    Object.assign(task, updateTaskDto);
    const updatedTask = await task.save();

    if (isNewlyAssigned) {
      await this.notificationsService.createNotification({
        type: 'TASK_ASSIGNED',
        title: 'You have a new task',
        message: `You have been assigned a new task: '${updatedTask.title}'`,
        recipients: [new Types.ObjectId(newAssignee)],
        sender: new Types.ObjectId(user._id),
        priority: NotificationPriority.HIGH,
        relatedEntities: [
          {
            entity: NotificationEntityType.TASK,
            entityId: updatedTask._id as Types.ObjectId,
          },
        ],
      });
    } else {
      await this.notificationsService.createNotification({
        type: 'TASK_UPDATED',
        title: 'Task Updated',
        message: `The task '${updatedTask.title}' has been updated.`,
        recipients: [project.projectManager as Types.ObjectId],
        sender: new Types.ObjectId(user._id),
        priority: NotificationPriority.LOW,
        relatedEntities: [
          {
            entity: NotificationEntityType.TASK,
            entityId: updatedTask._id as Types.ObjectId,
          },
        ],
      });
    }

    return updatedTask;
  }

  async findAll(projectId: string, user: UserPayload): Promise<Task[]> {
    const project = await this.projectsService.findById(projectId, user);
    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }
    return this.taskModel.find({ project: projectId }).exec();
  }

  async findOne(id: string, user: UserPayload): Promise<Task> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    await this.projectsService.findById(
      (task.project as Types.ObjectId).toString(),
      user,
    );
    return task;
  }

  async remove(id: string, user: UserPayload): Promise<void> {
    await this.findOne(id, user);
    await this.taskModel.deleteOne({ _id: id }).exec();
  }

  async search(query: string, user: UserPayload): Promise<Task[]> {
    const userProjects = await this.projectsService.findAllForUser(user);
    const projectIds = userProjects.map((p) => p._id);

    return this.taskModel
      .find({
        project: { $in: projectIds },
        $text: { $search: query },
      })
      .exec();
  }

  autocomplete(prefix: string): string[] {
    return this.trie.searchPrefix(prefix);
  }
}
