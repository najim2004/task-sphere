import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Query,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { RolesGuard } from '../../shared/guards/role.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UserPayload } from '../../shared/interfaces/user-payload.interface';
import { UserRole } from 'src/modules/users/schemas/user.schema';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
@UseInterceptors(CacheInterceptor)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: { user: UserPayload },
  ) {
    return this.tasksService.create(createTaskDto, req.user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  @CacheTTL(300)
  findById(@Param('id') id: string, @Request() req: { user: UserPayload }) {
    return this.tasksService.findById(id, req.user);
  }

  @Get('project/:projectId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  @CacheTTL(300)
  findForProject(
    @Param('projectId') projectId: string,
    @Request() req: { user: UserPayload },
  ) {
    return this.tasksService.findForProject(projectId, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: { user: UserPayload },
  ) {
    return this.tasksService.update(id, updateTaskDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  remove(@Param('id') id: string, @Request() req: { user: UserPayload }) {
    return this.tasksService.remove(id, req.user);
  }

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  @CacheTTL(300)
  search(@Query('q') query: string, @Request() req: { user: UserPayload }) {
    return this.tasksService.search(query, req.user);
  }

  @Get('autocomplete')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  @CacheTTL(300)
  autocomplete(@Query('prefix') prefix: string) {
    return this.tasksService.autocomplete(prefix);
  }
}
