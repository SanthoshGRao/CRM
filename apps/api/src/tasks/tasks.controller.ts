import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/billing/guards/subscription.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { scopeFilter } from '../common/rbac/scope';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard, PermissionGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermission('tasks.view')
  @ApiOperation({ summary: 'List tasks with pagination and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'assignedToId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  async findAll(@CurrentUser() user: any, @Query() query: any) {
    const result = await this.tasksService.findAll(user.tenantId, query, scopeFilter(user, 'task'));
    return { success: true, ...result };
  }

  @Get(':id')
  @RequirePermission('tasks.view')
  @ApiOperation({ summary: 'Get a single task' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const task = await this.tasksService.findOne(id, user.tenantId, scopeFilter(user, 'task'));
    return { success: true, data: task };
  }

  @Post()
  @RequirePermission('tasks.create')
  @ApiOperation({ summary: 'Create a new task' })
  async create(@Body() dto: CreateTaskDto, @CurrentUser() user: any) {
    const task = await this.tasksService.create(dto, user.tenantId, user.id);
    return { success: true, data: task, message: 'Task created successfully' };
  }

  @Patch(':id')
  @RequirePermission('tasks.update')
  @ApiOperation({ summary: 'Update a task' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: any,
  ) {
    const task = await this.tasksService.update(id, dto, user.tenantId, user.id, scopeFilter(user, 'task'));
    return { success: true, data: task, message: 'Task updated successfully' };
  }

  @Delete(':id')
  @RequirePermission('tasks.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a task' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const result = await this.tasksService.remove(id, user.tenantId, user.id, scopeFilter(user, 'task'));
    return { success: true, data: result, message: 'Task deleted' };
  }

  @Patch('bulk/update')
  @RequirePermission('tasks.update')
  @ApiOperation({ summary: 'Bulk update multiple tasks' })
  async bulkUpdate(
    @Body() body: { ids: string[]; data: { assignedToId?: string; status?: string; priority?: string } },
    @CurrentUser() user: any,
  ) {
    const result = await this.tasksService.bulkUpdate(body.ids, body.data, user.tenantId);
    return { success: true, data: result };
  }

  @Delete('bulk/delete')
  @RequirePermission('tasks.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete multiple tasks' })
  async bulkDelete(@Body('ids') ids: string[], @CurrentUser() user: any) {
    const result = await this.tasksService.bulkDelete(ids, user.tenantId);
    return { success: true, data: result };
  }
}
