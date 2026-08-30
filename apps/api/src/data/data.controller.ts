import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard';
import { RequireScope } from '../api-keys/decorators/require-scope.decorator';
import { ApiTenantId } from '../api-keys/decorators/api-tenant.decorator';
import { ApiKeyActorId } from '../api-keys/decorators/api-key-actor.decorator';
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
  @ApiOperation({ summary: 'Verify the connection and discover the available resources' })
  async index(@ApiTenantId() tenantId: string, @Req() req: any) {
    return {
      success: true,
      data: {
        status: 'connected',
        tenantId,
        workspace: { id: tenantId, name: req.tenant?.name },
        apiKey: { name: req.apiKey?.name, scopes: req.apiKey?.scopes },
        resources: DATA_RESOURCES,
        usage: {
          list: 'GET /api/v1/data/{resource}?page=1&limit=50&search=&updatedSince=',
          get: 'GET /api/v1/data/{resource}/{id}',
          create: 'POST /api/v1/data/{resource}',
          update: 'PATCH /api/v1/data/{resource}/{id}',
          remove: 'DELETE /api/v1/data/{resource}/{id}',
        },
        users: {
          note: 'Read-only team-member directory — resolves the user ids referenced by ownerId/assignedToId/performedById above. Requires the "read:users" scope, separate from "read".',
          list: 'GET /api/v1/data/users?page=1&limit=50',
          get: 'GET /api/v1/data/users/{id}',
        },
        teams: {
          note: 'Groups for organizing workspace users (e.g. "Sales Team") — separate from the resources above. Requires the "read"/"write" scopes, same as everything else here.',
          list: 'GET /api/v1/data/teams',
          get: 'GET /api/v1/data/teams/{id}',
          create: 'POST /api/v1/data/teams { name, description?, managerId? }',
          update: 'PATCH /api/v1/data/teams/{id}',
          remove: 'DELETE /api/v1/data/teams/{id}',
          addMember: 'POST /api/v1/data/teams/{id}/members { userId }',
          removeMember: 'DELETE /api/v1/data/teams/{id}/members/{userId}',
          moveMember: 'PATCH /api/v1/data/teams/{id}/members/{userId}/move { toTeamId } — moves a member from group {id} into toTeamId',
        },
        customFields: {
          note: 'Workspace-specific columns on contacts/companies/leads/deals — separate from the resources above. entityType is one of: contact, company, lead, deal.',
          list: 'GET /api/v1/data/custom-fields?entityType=contact',
          create: 'POST /api/v1/data/custom-fields { entityType, label, fieldType, options? }',
          update: 'PATCH /api/v1/data/custom-fields/{id}',
          remove: 'DELETE /api/v1/data/custom-fields/{id}',
          getValues: 'GET /api/v1/data/custom-fields/values/{entityType}/{recordId}',
          setValues: 'PUT /api/v1/data/custom-fields/values/{entityType}/{recordId} { values: { fieldId: value } }',
          optionsShape:
            'options is an array of objects, not strings: [{ "label": "High priority", "value": "high"? }] — value defaults to a slug of label if omitted.',
          writingDropdownValues:
            'setValues accepts either the option\'s value (slug) or its label (case-insensitive) for dropdown/multi_select fields; it is normalised to the slug before storage. ' +
            'multi_select values are a single comma-separated string, e.g. "vip,renewal".',
        },
        notes: {
          actorFields:
            'Creating an "activity" or "task" without performedById/createdById ' +
            'defaults it to whichever user issued this API key.',
          activitiesLinking:
            'Activities link via relatedType (required, lowercase: contact|company|lead|deal|task) plus exactly one of ' +
            'relatedContactId / relatedCompanyId / relatedLeadId / relatedDealId. There is no contactId/leadId/dealId/relatedId — those are rejected.',
          enums: {
            'contacts.status': ['active', 'inactive', 'blocked'],
            'companies.status': ['active', 'inactive'],
            'leads.status': ['new', 'working', 'qualified', 'unqualified', 'converted', 'lost'],
            'deals.status': ['open', 'won', 'lost'],
            'activities.type':
              'call, email, whatsapp, sms, meeting, note are the types meant for integrations to write; ' +
              'task_created, task_completed, status_changed, stage_changed, assigned, record_created, record_updated, record_deleted are system-generated audit-trail types.',
            'activities.relatedType': ['contact', 'company', 'lead', 'deal', 'task'],
          },
        },
        auth: 'Send your key as the X-API-Key header.',
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
    @ApiKeyActorId() actorId: string | null,
    @Body() body: Record<string, any>,
  ) {
    const data = await this.dataService.create(resource, tenantId, body, actorId);
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
