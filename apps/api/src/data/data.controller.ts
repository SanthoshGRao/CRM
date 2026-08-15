import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard';
import { RequireScope } from '../api-keys/decorators/require-scope.decorator';
import { ApiTenantId } from '../api-keys/decorators/api-tenant.decorator';
import { DataService, DATA_RESOURCES } from './data.service';

/**
 * Public data API for customer integrations. Authenticated purely by API key —
 * never by a user session — and always scoped to that key's workspace.
 */
@ApiTags('data-api')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get()
  @RequireScope('read')
  @ApiOperation({ summary: 'Discover the available resources' })
  async index(@ApiTenantId() tenantId: string) {
    return {
      success: true,
      data: {
        resources: DATA_RESOURCES,
        usage: {
          list: 'GET /api/v1/data/{resource}?page=1&limit=50&search=&updatedSince=',
          get: 'GET /api/v1/data/{resource}/{id}',
          create: 'POST /api/v1/data/{resource}',
          update: 'PATCH /api/v1/data/{resource}/{id}',
          remove: 'DELETE /api/v1/data/{resource}/{id}',
        },
        auth: 'Send your key as the X-API-Key header.',
        tenantId,
      },
    };
  }

  @Get(':resource')
  @RequireScope('read')
  @ApiOperation({ summary: 'List records of a resource' })
  @ApiParam({ name: 'resource', enum: DATA_RESOURCES as unknown as string[] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Max 200' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'updatedSince', required: false, description: 'ISO date — for incremental syncs' })
  async list(
    @Param('resource') resource: string,
    @ApiTenantId() tenantId: string,
    @Query() query: any,
  ) {
    const result = await this.dataService.list(resource, tenantId, query);
    return { success: true, ...result };
  }

  @Get(':resource/:id')
  @RequireScope('read')
  @ApiOperation({ summary: 'Fetch a single record' })
  async get(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @ApiTenantId() tenantId: string,
  ) {
    const data = await this.dataService.get(resource, id, tenantId);
    return { success: true, data };
  }

  @Post(':resource')
  @RequireScope('write')
  @ApiOperation({ summary: 'Create a record' })
  async create(
    @Param('resource') resource: string,
    @ApiTenantId() tenantId: string,
    @Body() body: Record<string, any>,
  ) {
    const data = await this.dataService.create(resource, tenantId, body);
    return { success: true, data };
  }

  @Patch(':resource/:id')
  @RequireScope('write')
  @ApiOperation({ summary: 'Update a record' })
  async update(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @ApiTenantId() tenantId: string,
    @Body() body: Record<string, any>,
  ) {
    const data = await this.dataService.update(resource, id, tenantId, body);
    return { success: true, data };
  }

  @Delete(':resource/:id')
  @RequireScope('write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a record' })
  async remove(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @ApiTenantId() tenantId: string,
  ) {
    const data = await this.dataService.remove(resource, id, tenantId);
    return { success: true, data };
  }
}
