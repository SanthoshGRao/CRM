import {
  Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/billing/guards/subscription.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/api-key.dto';

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard, PermissionGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @RequirePermission('api_keys.view')
  @ApiOperation({ summary: 'List this workspace’s API keys (never returns the secret)' })
  async findAll(@CurrentUser() user: any) {
    const data = await this.apiKeysService.findAll(user.tenantId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission('api_keys.create')
  @ApiOperation({ summary: 'Create an API key (can be re-revealed later via GET :id/reveal)' })
  async create(@Body() dto: CreateApiKeyDto, @CurrentUser() user: any) {
    const data = await this.apiKeysService.create(dto, user.tenantId, user.id);
    return { success: true, data, message: 'API key created.' };
  }

  @Get(':id/reveal')
  @RequirePermission('api_keys.view')
  @ApiOperation({ summary: 'Re-fetch the full secret so it can be copied again' })
  async reveal(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.apiKeysService.reveal(id, user.tenantId);
    return { success: true, data };
  }

  @Post(':id/revoke')
  @RequirePermission('api_keys.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  async revoke(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.apiKeysService.revoke(id, user.tenantId);
    return { success: true, data, message: 'API key revoked' };
  }

  @Delete(':id')
  @RequirePermission('api_keys.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an API key' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.apiKeysService.remove(id, user.tenantId);
    return { success: true, data, message: 'API key deleted' };
  }
}
