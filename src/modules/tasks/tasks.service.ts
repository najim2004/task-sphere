import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Task, TaskStatus } from './schemas/task.schema';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ProjectsService } from '../projects/projects.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Trie } from './trie';
import { topologicalSort } from '../../shared/utils/topological-sort';

import { UserPayload } from 'src/shared/interfaces/user-payload.interface';
import { UserRole } from 'src/modules/users/schemas/user.schema';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class TasksService {
  private trie = new Trie();

  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    private readonly projectsService: ProjectsService,
    private readonly analyticsService: AnalyticsService,
  ) {
    void this.initTrie(); // Suppress no-floating-promises
  }

  private async initTrie() {
    const tasks = await this.taskModel.find({}, 'title').exec();
    tasks.forEach((task) => this.trie.insert(task.title.toLowerCase()));
  }

  async create(createTaskDto: CreateTaskDto, user: UserPayload): Promise<Task> {
    await this.projectsService.findById(createTaskDto.projectId, user);

    if (
      user.role === UserRole.TEAM_MEMBER &&
      createTaskDto.assignedTo &&
      createTaskDto.assignedTo !== user._id
    ) {
      throw new ForbiddenException(
        'Team members can only assign tasks to themselves',
      );
    }

    if (createTaskDto.dependencies?.length) {
      await this.validateDependencies(
        createTaskDto.projectId,
        createTaskDto.dependencies,
        null,
      );
    }

    const newTask = new this.taskModel({
      ...createTaskDto,
      project: createTaskDto.projectId,
      assignedTo: new Types.ObjectId(createTaskDto.assignedTo ?? user._id),
      createdBy: user._id,
    });

    const savedTask = await newTask.save();
    this.trie.insert(savedTask.title.toLowerCase());

    // Notify assigned member, project manager, and admins
    // await this.notificationsService.createAndSendNotification({
    //   type: NotificationType.TASK_ASSIGNED,
    //   title: 'New Task Assigned',
    //   message: `You have been assigned to task: ${savedTask.title}`,
    //   senderId: user._id,
    //   relatedEntity: 'task',
    //   relatedEntityId: (savedTask._id as Types.ObjectId).toString(),
    //   projectId: (savedTask.project as Types.ObjectId).toString(),
    //   recipientIds: [(savedTask.assignedTo as Types.ObjectId).toString()],
    // });

    return savedTask;
  }

  async findById(taskId: string, user: UserPayload): Promise<Task> {
    const task = await this.taskModel
      .findById(taskId)
      .populate('project')
      .populate('assignedTo', 'firstName lastName email')
      .populate('dependencies', 'title status')
      .exec();

    if (!task) throw new NotFoundException('Task not found');

    await this.projectsService.findById(
      (task.project as Types.ObjectId).toString(),
      user,
    );

    return task;
  }

  async update(
    taskId: string,
    updateTaskDto: UpdateTaskDto,
    user: UserPayload,
  ): Promise<Task> {
    const task = await this.taskModel
      .findById(taskId)
      .populate('project')
      .populate('assignedTo')
      .exec();

    if (!task) throw new NotFoundException('Task not found');

    await this.projectsService.findById(
      (task.project as Types.ObjectId).toString(),
      user,
    );

    if (user.role === UserRole.TEAM_MEMBER) {
      if ((task.assignedTo as Types.ObjectId)._id.toString() !== user._id) {
        throw new ForbiddenException(
          'You can only update tasks assigned to you',
        );
      }
      const allowedUpdates = ['status', 'comments'];
      if (
        !Object.keys(updateTaskDto).every((key) => allowedUpdates.includes(key))
      ) {
        throw new ForbiddenException(
          'Team members can only update task status and add comments',
        );
      }
    }

    const oldStatus = task.status;
    Object.assign(task, updateTaskDto);
    const updatedTask = await task.save();

    // Notify assigned member, project manager, and admins
    // await this.notificationsService.createAndSendNotification({
    //   type: NotificationType.TASK_UPDATED,
    //   title: 'Task Updated',
    //   message: `Task ${updatedTask.title} has been updated.`,
    //   senderId: user._id,
    //   relatedEntity: 'task',
    //   relatedEntityId: (updatedTask._id as Types.ObjectId).toString(),
    //   projectId: (updatedTask.project as Types.ObjectId).toString(),
    //   recipientIds: [(updatedTask.assignedTo as Types.ObjectId).toString()],
    // });

    if (
      updateTaskDto.status &&
      updateTaskDto.status !== oldStatus &&
      updateTaskDto.status === TaskStatus.COMPLETED
    ) {
      void this.analyticsService.logEvent({
        event: 'TASK_COMPLETED',
        userId: new Types.ObjectId(user._id),
        details: {
          taskId: updatedTask._id,
          projectId: updatedTask.project,
        },
      });
    }

    return updatedTask;
  }

  async remove(
    taskId: string,
    user: UserPayload,
  ): Promise<{ message: string }> {
    const task = await this.taskModel
      .findById(taskId)
      .populate('project')
      .exec();

    if (!task) throw new NotFoundException('Task not found');

    await this.projectsService.findById(
      (task.project as Types.ObjectId).toString(),
      user,
    );

    if (![UserRole.ADMIN, UserRole.PROJECT_MANAGER].includes(user.role)) {
      throw new ForbiddenException(
        'Only admin or project manager can delete tasks',
      );
    }

    await task.deleteOne();

    // Notify project manager and admins
    // await this.notificationsService.createAndSendNotification({
    //   type: NotificationType.TASK_UPDATED,
    //   title: 'Task Deleted',
    //   message: `Task ${task.title} has been deleted.`,
    //   senderId: user._id,
    //   relatedEntity: 'task',
    //   relatedEntityId: (task._id as Types.ObjectId).toString(),
    //   projectId: (task.project as Types.ObjectId).toString(),
    // });

    return { message: `Task with ID ${taskId} deleted successfully` };
  }

  async findForProject(projectId: string, user: UserPayload): Promise<Task[]> {
    await this.projectsService.findById(projectId, user);

    const query: FilterQuery<Task> = { project: projectId };

    if (user.role === UserRole.TEAM_MEMBER) {
      query.assignedTo = user._id;
    }

    return this.taskModel
      .find(query)
      .populate('assignedTo', 'firstName lastName email')
      .exec();
  }

  async search(query: string, user: UserPayload): Promise<Task[]> {
    let projectIds: string[] = [];

    if (user.role === UserRole.ADMIN) {
      projectIds = (await this.projectsService.findAllForUser(user)).map((p) =>
        (p._id as Types.ObjectId).toString(),
      );
    } else {
      projectIds = (await this.projectsService.findAllForUser(user)).map((p) =>
        (p._id as Types.ObjectId).toString(),
      );
    }

    if (!projectIds.length && user.role !== UserRole.ADMIN) return [];

    const searchCriteria: FilterQuery<Task> = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    };

    if (user.role !== UserRole.ADMIN)
      searchCriteria.project = { $in: projectIds };

    if (user.role === UserRole.TEAM_MEMBER)
      searchCriteria.assignedTo = user._id;

    return this.taskModel.find(searchCriteria).exec();
  }

  autocomplete(prefix: string): string[] {
    return this.trie.searchPrefix(prefix.toLowerCase());
  }

  private async validateDependencies(
    projectId: string,
    dependencyIds: string[],
    currentTaskId: string | null,
  ): Promise<void> {
    const allTasksInProject = await this.taskModel
      .find({ project: new Types.ObjectId(projectId) })
      .select('_id dependencies')
      .exec();

    const nodes = allTasksInProject.map((task) => ({
      id: (task._id as Types.ObjectId).toString(),
    }));

    const edges: [string, string][] = [];

    allTasksInProject.forEach((task) => {
      (task.dependencies as (Types.ObjectId | Task)[]).forEach((depId) =>
        edges.push([
          (task._id as Types.ObjectId).toString(),
          depId instanceof Types.ObjectId
            ? depId.toString()
            : (depId._id as Types.ObjectId).toString(),
        ]),
      );
    });

    const taskToValidateId = currentTaskId || new Types.ObjectId().toString();
    dependencyIds.forEach((depId) => edges.push([taskToValidateId, depId]));

    try {
      topologicalSort(nodes, edges);
    } catch {
      throw new BadRequestException('Circular dependency detected');
    }
  }
}
