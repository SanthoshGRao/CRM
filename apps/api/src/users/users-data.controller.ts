import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard';
import { RequireScope } from '../api-keys/decorators/require-scope.decorator';
import { ApiTenantId } from '../api-keys/decorators/api-tenant.decorator';
import { UsersService } from './users.service';

/**
 * Read-only team-member directory for customer integrations — lets an
 * API-key caller resolve/validate the user ids it sees on `ownerId`,
 * `assignedToId` and `performedById` elsewhere in the data API. Gated behind
 * its own `read:users` scope (separate from `read`) since it exposes team
 * member records rather than CRM records.
 */
@ApiTags('data-api')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('data/users')
export class UsersDataController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequireScope('read:users')
  @ApiOperation({ summary: 'List team members in this workspace' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Max 200' })
  async list(@ApiTenantId() tenantId: string, @Query() query: any) {
    const result = await this.usersService.listForApiKey(tenantId, query);
    return { success: true, ...result };
  }

  @Get(':id')
  @RequireScope('read:users')
  @ApiOperation({ summary: 'Fetch a single team member' })
  async get(@Param('id') id: string, @ApiTenantId() tenantId: string) {
    const data = await this.usersService.findOneForApiKey(id, tenantId);
    return { success: true, data };
  }
}
