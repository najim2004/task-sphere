import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UsersService } from '../users/users.service';
import { User } from 'src/modules/users/schemas/user.schema';
import { UserPayload } from 'src/shared/interfaces/user-payload.interface';
import { UserRole } from 'src/modules/users/schemas/user.schema';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    private usersService: UsersService,
  ) {}

  async create(dto: CreateProjectDto, user: UserPayload): Promise<Project> {
    const newProject = new this.projectModel({
      ...dto,
      projectManager: user._id,
      teamMembers: [user._id],
    });
    const savedProject = await newProject.save();

    // Notify project manager and admins
    // await this.notificationsService.createAndSendNotification({
    //   type: NotificationType.PROJECT_ASSIGNED,
    //   title: 'New Project Created',
    //   message: `You have been assigned to project ${savedProject.name}`,
    //   senderId: user._id,
    //   relatedEntity: 'project',
    //   relatedEntityId: (savedProject._id as Types.ObjectId).toString(),
    //   projectId: (savedProject._id as Types.ObjectId).toString(),
    //   recipientIds: [user._id],
    // });

    return savedProject;
  }

  async findAllForUser(user: UserPayload): Promise<Project[]> {
    if (user.role === UserRole.ADMIN) {
      return this.projectModel
        .find()
        .populate('projectManager', 'firstName lastName email')
        .populate('teamMembers', 'firstName lastName email')
        .exec();
    }
    return this.projectModel
      .find({ teamMembers: user._id })
      .populate('projectManager', 'firstName lastName email')
      .populate('teamMembers', 'firstName lastName email')
      .exec();
  }

  async findById(
    projectId: string | Types.ObjectId,
    user: UserPayload,
  ): Promise<Project> {
    const project = await this.projectModel
      .findById(projectId)
      .populate<{ teamMembers: User[] }>('teamMembers')
      .populate('projectManager')
      .exec();
    if (!project) throw new NotFoundException('Project not found');

    if (user.role !== UserRole.ADMIN) {
      const memberIds = project.teamMembers.map((m) =>
        (m._id as Types.ObjectId).toString(),
      );
      if (!memberIds.includes(user._id)) {
        throw new ForbiddenException('You are not a member of this project');
      }
    }
    return project;
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    user: UserPayload,
  ): Promise<Project> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');

    if (
      user.role !== UserRole.ADMIN &&
      (project.projectManager._id as Types.ObjectId).toString() !== user._id
    ) {
      throw new ForbiddenException(
        'Only the project manager can update this project',
      );
    }

    Object.assign(project, dto);
    const savedProject = await project.save();

    // Notify project manager and admins
    // await this.notificationsService.createAndSendNotification({
    //   type: NotificationType.PROJECT_UPDATED,
    //   title: 'Project Updated',
    //   message: `Project ${savedProject.name} has been updated.`,
    //   senderId: user._id,
    //   relatedEntity: 'project',
    //   relatedEntityId: (savedProject._id as Types.ObjectId).toString(),
    //   projectId: (savedProject._id as Types.ObjectId).toString(),
    // });

    return savedProject;
  }

  async remove(id: string, user: UserPayload): Promise<{ message: string }> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');

    if (
      user.role !== UserRole.ADMIN &&
      (project.projectManager._id as Types.ObjectId).toString() !== user._id
    ) {
      throw new ForbiddenException(
        'Only the project manager can delete this project',
      );
    }

    await project.deleteOne();

    // Notify project manager and admins
    // await this.notificationsService.createAndSendNotification({
    //   type: NotificationType.PROJECT_UPDATED,
    //   title: 'Project Deleted',
    //   message: `Project ${project.name} has been deleted.`,
    //   senderId: user._id,
    //   relatedEntity: 'project',
    //   relatedEntityId: (project._id as Types.ObjectId).toString(),
    //   projectId: (project._id as Types.ObjectId).toString(),
    // });

    return { message: `Project with ID ${id} deleted successfully` };
  }

  async addMember(
    id: string,
    dto: AddMemberDto,
    user: UserPayload,
  ): Promise<Project> {
    const project = await this.projectModel
      .findById(id)
      .populate<{
        projectManager: User & { _id: Types.ObjectId };
      }>('projectManager')
      .exec();
    if (!project) throw new NotFoundException('Project not found');

    if (
      user.role !== UserRole.ADMIN &&
      !project.projectManager._id.equals(user._id)
    ) {
      throw new ForbiddenException('Only the project manager can add members');
    }

    const userToAdd = await this.usersService.findByEmail(dto.email);
    if (!userToAdd) throw new NotFoundException('User to add not found');

    if (
      project.teamMembers.some((m) =>
        (m._id as Types.ObjectId).equals(userToAdd._id as Types.ObjectId),
      )
    ) {
      throw new BadRequestException(
        `User ${userToAdd.email} is already a member`,
      );
    }

    project.teamMembers.push(userToAdd._id as Types.ObjectId);
    const savedProject = await project.save();

    // Notify added member, project manager, and admins
    // await this.notificationsService.createAndSendNotification({
    //   type: NotificationType.PROJECT_ASSIGNED,
    //   title: 'Project Assignment',
    //   message: `You have been added to project ${savedProject.name}`,
    //   senderId: user._id,
    //   relatedEntity: 'project',
    //   relatedEntityId: (savedProject._id as Types.ObjectId).toString(),
    //   projectId: (savedProject._id as Types.ObjectId).toString(),
    //   recipientIds: [(userToAdd._id as Types.ObjectId).toString()],
    // });

    return savedProject;
  }

  async removeMember(
    id: string,
    memberId: string,
    user: UserPayload,
  ): Promise<Project> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');

    if (
      user.role !== UserRole.ADMIN &&
      (project.projectManager._id as Types.ObjectId).toString() !== user._id
    ) {
      throw new ForbiddenException(
        'Only the project manager can remove members',
      );
    }

    const memberObjectId = new Types.ObjectId(memberId);
    const initialLength = project.teamMembers.length;
    project.teamMembers = project.teamMembers.filter(
      (m: User) => !(m._id as Types.ObjectId).equals(memberObjectId),
    );
    if (project.teamMembers.length === initialLength) {
      throw new NotFoundException('Member not found in this project');
    }

    return project.save();
  }
}
