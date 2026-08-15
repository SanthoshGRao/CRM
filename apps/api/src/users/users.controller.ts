import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('users.view')
  async findAll(@CurrentUser() user: any, @Query() query: any) {
    const result = await this.usersService.findAll(user.tenantId, query);
    return { success: true, ...result };
  }

  @Get('roles')
  @RequirePermission('users.view')
  @ApiOperation({ summary: 'Roles available in this workspace' })
  async roles(@CurrentUser() user: any) {
    const data = await this.usersService.roles(user.tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('users.view')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.usersService.findOne(id, user.tenantId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission('users.create')
  @ApiOperation({ summary: 'Add a team member to this workspace' })
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    const data = await this.usersService.create(dto, user.tenantId, user.id);
    return { success: true, data, message: 'Team member added' };
  }

  @Patch(':id')
  @RequirePermission('users.update')
  @ApiOperation({
    summary: 'Update a team member (status or phone)',
    description: 'Roles are fixed when the member is created and cannot be reassigned here.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status?: string; phone?: string },
    @CurrentUser() user: any,
  ) {
    const data = await this.usersService.update(id, user.tenantId, body);
    return { success: true, data, message: 'Team member updated' };
  }

  @Delete(':id')
  @RequirePermission('users.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a team member' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.usersService.remove(id, user.tenantId, user.id);
    return { success: true, data, message: 'Team member removed' };
  }
}
