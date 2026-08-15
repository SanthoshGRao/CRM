import {
  Controller, Get, Post, Patch, Delete, Put, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDto, UpdateCustomFieldDto, SetCustomFieldValuesDto,
} from './dto/custom-field.dto';

@ApiTags('custom-fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  @RequirePermission('custom_fields.view')
  @ApiOperation({ summary: 'List custom fields (columns) for this workspace' })
  @ApiQuery({ name: 'entityType', required: false, enum: ['contact', 'company', 'lead', 'deal'] })
  @ApiQuery({ name: 'includeInactive', required: false })
  async findAll(@CurrentUser() user: any, @Query() query: any) {
    const data = await this.customFieldsService.findAll(user.tenantId, query);
    return { success: true, data };
  }

  @Post()
  @RequirePermission('custom_fields.create')
  @ApiOperation({ summary: 'Add a custom field' })
  async create(@Body() dto: CreateCustomFieldDto, @CurrentUser() user: any) {
    const data = await this.customFieldsService.create(dto, user.tenantId);
    return { success: true, data, message: 'Custom field created' };
  }

  @Post('reorder')
  @RequirePermission('custom_fields.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder custom fields' })
  async reorder(@Body('ids') ids: string[], @CurrentUser() user: any) {
    const data = await this.customFieldsService.reorder(user.tenantId, ids ?? []);
    return { success: true, data };
  }

  // ── Values on a record ────────────────────────────────────────
  // Declared before ':id' so the literal segment wins the route match.

  @Get('values/:entityType/:recordId')
  @RequirePermission('custom_fields.view')
  @ApiOperation({ summary: 'Get custom field values for a record' })
  async getValues(
    @Param('entityType') entityType: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.customFieldsService.getValues(entityType, recordId, user.tenantId);
    return { success: true, data };
  }

  @Put('values/:entityType/:recordId')
  @RequirePermission('custom_fields.update')
  @ApiOperation({ summary: 'Set custom field values on a record' })
  async setValues(
    @Param('entityType') entityType: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: SetCustomFieldValuesDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.customFieldsService.setValues(
      entityType, recordId, user.tenantId, dto.values ?? {},
    );
    return { success: true, data, message: 'Custom fields saved' };
  }

  @Get(':id')
  @RequirePermission('custom_fields.view')
  @ApiOperation({ summary: 'Get one custom field' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.customFieldsService.findOne(id, user.tenantId);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('custom_fields.update')
  @ApiOperation({ summary: 'Update a custom field' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomFieldDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.customFieldsService.update(id, dto, user.tenantId);
    return { success: true, data, message: 'Custom field updated' };
  }

  @Delete(':id')
  @RequirePermission('custom_fields.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a custom field and all of its stored values' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.customFieldsService.remove(id, user.tenantId);
    return { success: true, data, message: 'Custom field deleted' };
  }
}
