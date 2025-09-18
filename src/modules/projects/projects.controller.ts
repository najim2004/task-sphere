import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  Get,
  Param,
  Patch,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UserPayload } from '../../shared/interfaces/user-payload.interface';
import { RolesGuard } from '../../shared/guards/role.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UserRole } from 'src/modules/users/schemas/user.schema';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  create(
    @Body() createProjectDto: CreateProjectDto,
    @Request() req: { user: UserPayload },
  ) {
    return this.projectsService.create(createProjectDto, req.user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  @UseInterceptors(CacheInterceptor) // ✅ auto cache for GET all
  findAllForUser(@Request() req: { user: UserPayload }) {
    return this.projectsService.findAllForUser(req.user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  @UseInterceptors(CacheInterceptor) // ✅ auto cache for GET by ID
  findOne(@Param('id') id: string, @Request() req: { user: UserPayload }) {
    return this.projectsService.findById(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: { user: UserPayload },
  ) {
    return this.projectsService.update(id, updateProjectDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  remove(@Param('id') id: string, @Request() req: { user: UserPayload }) {
    return this.projectsService.remove(id, req.user);
  }

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post(':id/members')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @Request() req: { user: UserPayload },
  ) {
    return this.projectsService.addMember(id, addMemberDto, req.user);
  }

  @Delete(':id/members/:memberId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: { user: UserPayload },
  ) {
    return this.projectsService.removeMember(id, memberId, req.user);
  }
}
