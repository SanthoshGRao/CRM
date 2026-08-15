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
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { scopeFilter } from '../common/rbac/scope';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermission('leads.view')
  @ApiOperation({ summary: 'List leads with pagination and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'stageId', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'pipelineId', required: false })
  async findAll(@CurrentUser() user: any, @Query() query: any) {
    const result = await this.leadsService.findAll(user.tenantId, query, scopeFilter(user, 'lead'));
    return { success: true, ...result };
  }

  @Get('kanban')
  @RequirePermission('leads.view')
  @ApiOperation({ summary: 'Get leads grouped by pipeline stage for kanban view' })
  async kanban(@CurrentUser() user: any, @Query('pipelineId') pipelineId: string) {
    const result = await this.leadsService.findAllByStage(user.tenantId, pipelineId);
    return { success: true, data: result };
  }

  @Get(':id')
  @RequirePermission('leads.view')
  @ApiOperation({ summary: 'Get a single lead with full details' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const lead = await this.leadsService.findOne(id, user.tenantId, scopeFilter(user, 'lead'));
    return { success: true, data: lead };
  }

  @Post()
  @RequirePermission('leads.create')
  @ApiOperation({ summary: 'Create a new lead' })
  async create(@Body() dto: CreateLeadDto, @CurrentUser() user: any) {
    const lead = await this.leadsService.create(dto, user.tenantId, user.id);
    return { success: true, data: lead, message: 'Lead created successfully' };
  }

  @Patch(':id')
  @RequirePermission('leads.update')
  @ApiOperation({ summary: 'Update a lead' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: any,
  ) {
    const lead = await this.leadsService.update(id, dto, user.tenantId, user.id, scopeFilter(user, 'lead'));
    return { success: true, data: lead, message: 'Lead updated successfully' };
  }

  @Post(':id/convert')
  @RequirePermission('leads.update', 'deals.create')
  @ApiOperation({ summary: 'Convert a lead into an open deal' })
  async convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() user: any,
  ) {
    const deal = await this.leadsService.convert(
      id,
      dto,
      user.tenantId,
      user.id,
      scopeFilter(user, 'lead'),
    );
    return { success: true, data: deal, message: 'Lead converted to deal' };
  }

  @Delete(':id')
  @RequirePermission('leads.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a lead' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.leadsService.remove(id, user.tenantId, user.id, scopeFilter(user, 'lead'));
    return { success: true, data: result, message: 'Lead deleted' };
  }

  @Patch('bulk/update')
  @RequirePermission('leads.update')
  @ApiOperation({ summary: 'Bulk update multiple leads' })
  async bulkUpdate(
    @Body() body: { ids: string[]; data: { ownerId?: string; stageId?: string; status?: string } },
    @CurrentUser() user: any,
  ) {
    const result = await this.leadsService.bulkUpdate(body.ids, body.data, user.tenantId);
    return { success: true, data: result };
  }

  @Delete('bulk/delete')
  @RequirePermission('leads.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete multiple leads' })
  async bulkDelete(@Body('ids') ids: string[], @CurrentUser() user: any) {
    const result = await this.leadsService.bulkDelete(ids, user.tenantId);
    return { success: true, data: result };
  }
}
