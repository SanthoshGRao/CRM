import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PipelinesService } from './pipelines.service';

@ApiTags('pipelines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get()
  @RequirePermission('pipelines.view')
  @ApiOperation({ summary: 'List pipelines with their stages' })
  @ApiQuery({ name: 'entityType', required: false, enum: ['lead', 'deal'] })
  async findAll(@CurrentUser() user: any, @Query('entityType') entityType?: 'lead' | 'deal') {
    const data = await this.pipelinesService.findAll(user.tenantId, entityType);
    return { success: true, data };
  }

  @Get('default')
  @RequirePermission('pipelines.view')
  @ApiOperation({ summary: 'Get the default pipeline for an entity type' })
  @ApiQuery({ name: 'entityType', required: false, enum: ['lead', 'deal'] })
  async findDefault(
    @CurrentUser() user: any,
    @Query('entityType') entityType: 'lead' | 'deal' = 'lead',
  ) {
    const data = await this.pipelinesService.findDefault(user.tenantId, entityType);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('pipelines.view')
  @ApiOperation({ summary: 'Get a single pipeline with its stages' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.pipelinesService.findOne(id, user.tenantId);
    return { success: true, data };
  }
}
