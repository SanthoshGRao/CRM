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
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard, PermissionGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @RequirePermission('deals.view')
  @ApiOperation({ summary: 'List deals with pagination and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'stageId', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'pipelineId', required: false })
  async findAll(@CurrentUser() user: any, @Query() query: any) {
    const result = await this.dealsService.findAll(user.tenantId, query, scopeFilter(user, 'deal'));
    return { success: true, ...result };
  }

  @Get('kanban')
  @RequirePermission('deals.view')
  @ApiOperation({ summary: 'Get deals grouped by pipeline stage for kanban view' })
  async kanban(@CurrentUser() user: any, @Query('pipelineId') pipelineId: string) {
    const result = await this.dealsService.findAllByStage(user.tenantId, pipelineId);
    return { success: true, data: result };
  }

  @Get(':id')
  @RequirePermission('deals.view')
  @ApiOperation({ summary: 'Get a single deal with full details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const deal = await this.dealsService.findOne(id, user.tenantId, scopeFilter(user, 'deal'));
    return { success: true, data: deal };
  }

  @Post()
  @RequirePermission('deals.create')
  @ApiOperation({ summary: 'Create a new deal' })
  async create(@Body() dto: CreateDealDto, @CurrentUser() user: any) {
    const deal = await this.dealsService.create(dto, user.tenantId, user.id);
    return { success: true, data: deal, message: 'Deal created successfully' };
  }

  @Patch(':id')
  @RequirePermission('deals.update')
  @ApiOperation({ summary: 'Update a deal' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDealDto,
    @CurrentUser() user: any,
  ) {
    const deal = await this.dealsService.update(id, dto, user.tenantId, user.id, scopeFilter(user, 'deal'));
    return { success: true, data: deal, message: 'Deal updated successfully' };
  }

  @Delete(':id')
  @RequirePermission('deals.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a deal' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const result = await this.dealsService.remove(id, user.tenantId, user.id, scopeFilter(user, 'deal'));
    return { success: true, data: result, message: 'Deal deleted' };
  }

  @Patch('bulk/update')
  @RequirePermission('deals.update')
  @ApiOperation({ summary: 'Bulk update multiple deals' })
  async bulkUpdate(
    @Body() body: { ids: string[]; data: { ownerId?: string; stageId?: string; status?: string } },
    @CurrentUser() user: any,
  ) {
    const result = await this.dealsService.bulkUpdate(body.ids, body.data, user.tenantId);
    return { success: true, data: result };
  }

  @Delete('bulk/delete')
  @RequirePermission('deals.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete multiple deals' })
  async bulkDelete(@Body('ids') ids: string[], @CurrentUser() user: any) {
    const result = await this.dealsService.bulkDelete(ids, user.tenantId);
    return { success: true, data: result };
  }
}
