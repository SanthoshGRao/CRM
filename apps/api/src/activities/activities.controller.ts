import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/billing/guards/subscription.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard, PermissionGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @RequirePermission('activities.view')
  @ApiOperation({ summary: 'List activities with pagination and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false, description: 'Comma-separated activity types' })
  @ApiQuery({ name: 'relatedType', required: false })
  async findAll(@CurrentUser() user: any, @Query() query: any) {
    const result = await this.activitiesService.findAll(user.tenantId, query);
    return { success: true, ...result };
  }

  @Get('stats')
  @RequirePermission('activities.view')
  @ApiOperation({ summary: 'Activity counts grouped by type' })
  async stats(@CurrentUser() user: any) {
    const data = await this.activitiesService.statsByType(user.tenantId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission('activities.create')
  @ApiOperation({ summary: 'Log an activity against a record' })
  async create(@Body() dto: CreateActivityDto, @CurrentUser() user: any) {
    const data = await this.activitiesService.create(dto, user.tenantId, user.id);
    return { success: true, data, message: 'Activity logged' };
  }
}
