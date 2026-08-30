import {
  Controller, Get, Post, Patch, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard';
import { RequireScope } from '../api-keys/decorators/require-scope.decorator';
import { ApiTenantId } from '../api-keys/decorators/api-tenant.decorator';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto, UpdateCustomFieldDto, SetCustomFieldValuesDto } from './dto/custom-field.dto';

/**
 * Custom field definitions and values, over the same API-key auth as the
 * data API (see DataController) — kept as its own controller because custom
 * fields have their own service logic (slugging, option handling, per-type
 * value validation) rather than the generic per-resource CRUD in DataService.
 */
@ApiTags('data-api')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('data/custom-fields')
export class CustomFieldsApiController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  @RequireScope('read')
  @ApiOperation({ summary: 'List custom fields (columns) for this workspace' })
  @ApiQuery({ name: 'entityType', required: false, enum: ['contact', 'company', 'lead', 'deal', 'task'] })
  @ApiQuery({ name: 'includeInactive', required: false })
  async findAll(@ApiTenantId() tenantId: string, @Query() query: any) {
    const data = await this.customFieldsService.findAll(tenantId, query);
    return { success: true, data };
  }

  // Declared before ':id' so the literal segment wins the route match.

  @Get('values/:entityType/:recordId')
  @RequireScope('read')
  @ApiOperation({ summary: 'Get custom field values for a record' })
  async getValues(
    @Param('entityType') entityType: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @ApiTenantId() tenantId: string,
  ) {
    const data = await this.customFieldsService.getValues(entityType, recordId, tenantId);
    return { success: true, data };
  }

  @Put('values/:entityType/:recordId')
  @RequireScope('write')
  @ApiOperation({ summary: 'Set custom field values on a record' })
  async setValues(
    @Param('entityType') entityType: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: SetCustomFieldValuesDto,
    @ApiTenantId() tenantId: string,
  ) {
    const data = await this.customFieldsService.setValues(entityType, recordId, tenantId, dto.values ?? {});
    return { success: true, data };
  }

  @Get(':id')
  @RequireScope('read')
  @ApiOperation({ summary: 'Get one custom field' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @ApiTenantId() tenantId: string) {
    const data = await this.customFieldsService.findOne(id, tenantId);
    return { success: true, data };
  }

  @Post()
  @RequireScope('write')
  @ApiOperation({ summary: 'Create a custom field' })
  async create(@Body() dto: CreateCustomFieldDto, @ApiTenantId() tenantId: string) {
    const data = await this.customFieldsService.create(dto, tenantId);
    return { success: true, data };
  }

  @Patch(':id')
  @RequireScope('write')
  @ApiOperation({ summary: 'Update a custom field' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomFieldDto,
    @ApiTenantId() tenantId: string,
  ) {
    const data = await this.customFieldsService.update(id, dto, tenantId);
    return { success: true, data };
  }

  @Delete(':id')
  @RequireScope('write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a custom field and all of its stored values' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @ApiTenantId() tenantId: string) {
    const data = await this.customFieldsService.remove(id, tenantId);
    return { success: true, data };
  }
}
