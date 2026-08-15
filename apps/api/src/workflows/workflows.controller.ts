import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'List automation workflows' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async findAll(@CurrentUser() user: any, @Query() query: any) {
    const result = await this.workflowsService.findAll(user.tenantId, query);
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single workflow with recent executions' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.workflowsService.findOne(id, user.tenantId);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a workflow' })
  async create(@Body() dto: CreateWorkflowDto, @CurrentUser() user: any) {
    const data = await this.workflowsService.create(dto, user.tenantId);
    return { success: true, data, message: 'Workflow created successfully' };
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Recent runs of a workflow' })
  @ApiQuery({ name: 'limit', required: false })
  async executions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const data = await this.workflowsService.executions(id, user.tenantId, Number(limit) || 20);
    return { success: true, data };
  }

  @Post(':id/simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dry run a workflow against a real record without executing actions' })
  async simulate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { recordId?: string },
    @CurrentUser() user: any,
  ) {
    const data = await this.workflowsService.simulate(id, user.tenantId, body?.recordId);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.workflowsService.update(id, dto, user.tenantId);
    return { success: true, data, message: 'Workflow updated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a workflow' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const data = await this.workflowsService.remove(id, user.tenantId);
    return { success: true, data, message: 'Workflow deleted' };
  }
}
