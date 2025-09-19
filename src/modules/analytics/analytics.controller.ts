import {
  Controller,
  Get,
  UseGuards,
  Request,
  UseInterceptors,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { UserRole } from '../users/schemas/user.schema';
import { UserPayload } from 'src/shared/interfaces/user-payload.interface';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { type Response } from 'express';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor) // Enable auto caching for all endpoints
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  @CacheTTL(300) // Cache 5 minutes
  getAnalytics(@Request() req: { user: UserPayload }) {
    return this.analyticsService.getAnalytics(req.user);
  }

  @Get('pdf')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  async generatePDF(
    @Request() req: { user: UserPayload },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.analyticsService.generatePDFReport(req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=analytics-report.pdf',
    );
    return new StreamableFile(pdfBuffer);
  }

  @Get('csv')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER)
  async generateCSV(
    @Request() req: { user: UserPayload },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const csvData = await this.analyticsService.generateCSVReport(req.user);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=analytics-report.csv',
    );
    return new StreamableFile(Buffer.from(csvData));
  }
}
