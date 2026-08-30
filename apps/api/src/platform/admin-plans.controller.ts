import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformJwtGuard } from './guards/platform-jwt.guard';
import { AdminPlansService } from './admin-plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/admin-plan.dto';

@ApiTags('platform-plans')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard)
@Controller('admin/plans')
export class AdminPlansController {
  constructor(private readonly adminPlansService: AdminPlansService) {}

  @Get()
  @ApiOperation({ summary: 'List pricing plans' })
  async findAll() {
    const data = await this.adminPlansService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Plan detail' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminPlansService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a pricing plan' })
  async create(@Body() dto: CreatePlanDto) {
    const data = await this.adminPlansService.create(dto);
    return { success: true, data, message: 'Plan created' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pricing plan' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    const data = await this.adminPlansService.update(id, dto);
    return { success: true, data, message: 'Plan updated' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a pricing plan (blocked while customers are subscribed to it)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminPlansService.remove(id);
    return { success: true, data, message: 'Plan deleted' };
  }
}
