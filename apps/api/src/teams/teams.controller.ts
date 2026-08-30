import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/billing/guards/subscription.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto, MoveTeamMemberDto } from './dto/team.dto';

/**
 * Groups (a.k.a. teams) that organize a workspace's users — e.g. "Sales
 * Team". Separate from Role: a Role decides what someone can do, a group is
 * just how they're organized. Membership is many-to-many, so a user can sit
 * in more than one group at once.
 */
@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard, PermissionGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @RequirePermission('teams.view')
  @ApiOperation({ summary: 'List groups in this workspace' })
  async findAll(@CurrentUser() user: any) {
    const data = await this.teamsService.findAll(user.tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('teams.view')
  @ApiOperation({ summary: 'A single group with its members' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.teamsService.findOne(id, user.tenantId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission('teams.create')
  @ApiOperation({ summary: 'Create a group, e.g. "Sales Team"' })
  async create(@Body() dto: CreateTeamDto, @CurrentUser() user: any) {
    const data = await this.teamsService.create(dto, user.tenantId);
    return { success: true, data, message: 'Group created' };
  }

  @Patch(':id')
  @RequirePermission('teams.update')
  @ApiOperation({ summary: 'Rename a group or change its description/manager' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.teamsService.update(id, user.tenantId, dto);
    return { success: true, data, message: 'Group updated' };
  }

  @Delete(':id')
  @RequirePermission('teams.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a group (its members are unaffected — just no longer grouped)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.teamsService.remove(id, user.tenantId);
    return { success: true, data, message: 'Group deleted' };
  }

  @Post(':id/members')
  @RequirePermission('teams.update')
  @ApiOperation({ summary: 'Add a workspace user to this group' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.teamsService.addMember(id, user.tenantId, dto.userId);
    return { success: true, data, message: 'Member added' };
  }

  @Delete(':id/members/:userId')
  @RequirePermission('teams.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from this group' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.teamsService.removeMember(id, user.tenantId, userId);
    return { success: true, data, message: 'Member removed' };
  }

  @Patch(':id/members/:userId/move')
  @RequirePermission('teams.update')
  @ApiOperation({ summary: 'Move a member from this group into another one' })
  async moveMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: MoveTeamMemberDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.teamsService.moveMember(id, user.tenantId, userId, dto.toTeamId);
    return { success: true, data, message: 'Member moved' };
  }
}
