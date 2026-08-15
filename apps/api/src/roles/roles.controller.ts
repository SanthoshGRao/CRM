import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('roles.view')
  @ApiOperation({ summary: 'Roles available in this workspace, with their permissions' })
  async findAll(@CurrentUser() user: any) {
    const data = await this.rolesService.findAll(user.tenantId);
    return { success: true, data };
  }

  @Get('catalogue')
  @RequirePermission('roles.view')
  @ApiOperation({ summary: 'Reference: every permission and what each seeded role holds' })
  catalogue() {
    return { success: true, data: this.rolesService.catalogue() };
  }

  @Get(':id')
  @RequirePermission('roles.view')
  @ApiOperation({ summary: 'A single role with its members' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.rolesService.findOne(id, user.tenantId);
    return { success: true, data };
  }
}
