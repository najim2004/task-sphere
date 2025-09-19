import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Task } from '../tasks/schemas/task.schema';
import { User, UserRole } from '../users/schemas/user.schema';
import { Project } from '../projects/schemas/project.schema';
import { ProjectsService } from '../projects/projects.service';
import {
  AnalyticsEvent,
  AnalyticsEventDocument,
} from './schemas/analytics.schema';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { UserPayload } from 'src/shared/interfaces/user-payload.interface';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(AnalyticsEvent.name)
    private readonly analyticsEventModel: Model<AnalyticsEventDocument>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    private readonly projectsService: ProjectsService,
  ) {}

  async logEvent(eventData: Partial<AnalyticsEvent>): Promise<AnalyticsEvent> {
    const newEvent = new this.analyticsEventModel(eventData);
    return newEvent.save();
  }

  async getAnalytics(user: UserPayload) {
    let taskQuery: FilterQuery<Task> = {};
    let userQuery: FilterQuery<User> = {};
    let projectQuery: FilterQuery<Project> = {};

    let userProjectIds: string[] = [];
    if (user.role !== UserRole.ADMIN) {
      const userProjects = await this.projectsService.findAllForUser(user);
      userProjectIds = userProjects.map((p) =>
        (p._id as Types.ObjectId).toString(),
      );
    }

    if (user.role === UserRole.PROJECT_MANAGER) {
      taskQuery = { project: { $in: userProjectIds } };
      projectQuery = { _id: { $in: userProjectIds } };
    } else if (user.role === UserRole.TEAM_MEMBER) {
      taskQuery = { assignedTo: user._id };
      userQuery = { _id: user._id };
    }

    const totalTasks = await this.taskModel.countDocuments(taskQuery);
    const completedTasks = await this.taskModel.countDocuments({
      ...taskQuery,
      status: 'completed',
    });

    const totalUsers = await this.userModel.countDocuments(userQuery);
    const totalProjects = await this.projectModel.countDocuments(projectQuery);

    return {
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      totalTasks,
      completedTasks,
      totalUsers,
      totalProjects,
    };
  }

  async generatePDFReport(user: UserPayload): Promise<Buffer> {
    let taskQuery: FilterQuery<Task> = {};
    let userProjectIds: string[] = [];
    if (user.role !== UserRole.ADMIN) {
      const userProjects = await this.projectsService.findAllForUser(user);
      userProjectIds = userProjects.map((p) =>
        (p._id as Types.ObjectId).toString(),
      );
    }
    if (user.role === UserRole.PROJECT_MANAGER) {
      taskQuery = { project: { $in: userProjectIds } };
    } else if (user.role === UserRole.TEAM_MEMBER) {
      taskQuery = { assignedTo: user._id };
    }
    const tasks = await this.taskModel
      .find(taskQuery)
      .populate<{ assignedTo: User }>('assignedTo', 'firstName lastName')
      .exec();

    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    doc.fontSize(20).text('Project Analytics Report', { align: 'center' });
    doc.moveDown();

    const analytics = await this.getAnalytics(user);
    doc
      .fontSize(14)
      .text(`Completion Rate: ${analytics.completionRate.toFixed(2)}%`);
    doc.text(`Total Tasks: ${analytics.totalTasks}`);
    doc.text(`Completed Tasks: ${analytics.completedTasks}`);
    if (user.role === UserRole.ADMIN) {
      doc.text(`Total Users: ${analytics.totalUsers}`);
      doc.text(`Total Projects: ${analytics.totalProjects}`);
    }
    doc.moveDown();

    doc.fontSize(16).text('Task Details', { underline: true });
    doc.moveDown();

    tasks.forEach((task) => {
      doc
        .fontSize(12)
        .text(
          `- ${task.title} (Status: ${task.status}, Priority: ${task.priority}, Assignee: ${task.assignedTo?.firstName || 'N/A'} ${task.assignedTo?.lastName || ''})`,
        );
    });

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.end();
    });
  }

  async generateCSVReport(user: UserPayload): Promise<string> {
    let taskQuery: FilterQuery<Task> = {};
    let userProjectIds: string[] = [];
    if (user.role !== UserRole.ADMIN) {
      const userProjects = await this.projectsService.findAllForUser(user);
      userProjectIds = userProjects.map((p) =>
        (p._id as Types.ObjectId).toString(),
      );
    }
    if (user.role === UserRole.PROJECT_MANAGER) {
      taskQuery = { project: { $in: userProjectIds } };
    } else if (user.role === UserRole.TEAM_MEMBER) {
      taskQuery = { assignedTo: user._id };
    }
    const tasks = await this.taskModel.find(taskQuery).lean().exec();
    const fields = [
      'title',
      'status',
      'priority',
      'assignedTo.firstName',
      'assignedTo.lastName',
      'dueDate',
    ];
    const parser = new Parser({ fields });
    return parser.parse(tasks);
  }
}
