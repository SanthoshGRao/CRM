import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard';
import { RequireScope } from '../api-keys/decorators/require-scope.decorator';
import { ApiTenantId } from '../api-keys/decorators/api-tenant.decorator';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto, MoveTeamMemberDto } from './dto/team.dto';

/**
 * Groups, over the same API-key auth as the data API (see DataController) —
 * kept as its own controller because groups have their own nested
 * member/move routes rather than the generic per-resource CRUD in DataService.
 */
@ApiTags('data-api')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('data/teams')
export class TeamsApiController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @RequireScope('read')
  @ApiOperation({ summary: 'List groups in this workspace' })
  async findAll(@ApiTenantId() tenantId: string) {
    const data = await this.teamsService.findAll(tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @RequireScope('read')
  @ApiOperation({ summary: 'A single group with its members' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @ApiTenantId() tenantId: string) {
    const data = await this.teamsService.findOne(id, tenantId);
    return { success: true, data };
  }

  @Post()
  @RequireScope('write')
  @ApiOperation({ summary: 'Create a group, e.g. "Sales Team"' })
  async create(@Body() dto: CreateTeamDto, @ApiTenantId() tenantId: string) {
    const data = await this.teamsService.create(dto, tenantId);
    return { success: true, data };
  }

  @Patch(':id')
  @RequireScope('write')
  @ApiOperation({ summary: 'Rename a group or change its description/manager' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
    @ApiTenantId() tenantId: string,
  ) {
    const data = await this.teamsService.update(id, tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequireScope('write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a group' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @ApiTenantId() tenantId: string) {
    const data = await this.teamsService.remove(id, tenantId);
    return { success: true, data };
  }

  @Post(':id/members')
  @RequireScope('write')
  @ApiOperation({ summary: 'Add a workspace user to this group' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTeamMemberDto,
    @ApiTenantId() tenantId: string,
  ) {
    const data = await this.teamsService.addMember(id, tenantId, dto.userId);
    return { success: true, data };
  }

  @Delete(':id/members/:userId')
  @RequireScope('write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from this group' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @ApiTenantId() tenantId: string,
  ) {
    const data = await this.teamsService.removeMember(id, tenantId, userId);
    return { success: true, data };
  }

  @Patch(':id/members/:userId/move')
  @RequireScope('write')
  @ApiOperation({ summary: 'Move a member from this group into another one' })
  async moveMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: MoveTeamMemberDto,
    @ApiTenantId() tenantId: string,
  ) {
    const data = await this.teamsService.moveMember(id, tenantId, userId, dto.toTeamId);
    return { success: true, data };
  }
}
