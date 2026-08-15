import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { scopeFilter } from '../common/rbac/scope';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  async getKpis(@CurrentUser() user: any) {
    const data = await this.dashboardService.getKpis(user.tenantId, scopeFilter(user, 'lead'));
    return { success: true, data };
  }

  @Get('pipeline')
  async getPipeline(@CurrentUser() user: any) {
    const data = await this.dashboardService.getPipelineData(user.tenantId, scopeFilter(user, 'lead'));
    return { success: true, data };
  }

  @Get('activities')
  async getActivities(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const data = await this.dashboardService.getRecentActivities(
      user.tenantId,
      limit ? parseInt(limit) : 20,
    );
    return { success: true, data };
  }

  @Get('lead-sources')
  async getLeadSources(@CurrentUser() user: any) {
    const data = await this.dashboardService.getLeadSourceBreakdown(user.tenantId, scopeFilter(user, 'lead'));
    return { success: true, data };
  }
}
