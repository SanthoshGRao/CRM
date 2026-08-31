import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/billing/guards/subscription.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SavedViewsService } from './saved-views.service';
import { CreateSavedViewDto, UpdateSavedViewDto } from './dto/saved-view.dto';

@ApiTags('saved-views')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('saved-views')
export class SavedViewsController {
  constructor(private readonly savedViewsService: SavedViewsService) {}

  @Get()
  @ApiOperation({ summary: "List a user's own views plus the workspace's public ones, for one entity type" })
  @ApiQuery({ name: 'entityType', required: true })
  async findAll(@CurrentUser() user: any, @Query('entityType') entityType: string) {
    const data = await this.savedViewsService.findAll(user.tenantId, user.id, entityType, user.permissions ?? []);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Save the current filters/columns/sort as a named view' })
  async create(@Body() dto: CreateSavedViewDto, @CurrentUser() user: any) {
    const data = await this.savedViewsService.create(dto, user.tenantId, user.id, user.permissions ?? []);
    return { success: true, data, message: 'View saved' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename or update a view you created' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSavedViewDto, @CurrentUser() user: any) {
    const data = await this.savedViewsService.update(id, dto, user.tenantId, user.id);
    return { success: true, data, message: 'View updated' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a view you created' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.savedViewsService.remove(id, user.tenantId, user.id);
    return { success: true, data, message: 'View deleted' };
  }
}
