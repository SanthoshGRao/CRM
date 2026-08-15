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
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { scopeFilter } from '../common/rbac/scope';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @RequirePermission('companies.view')
  @ApiOperation({ summary: 'List companies with pagination and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(@CurrentUser() user: any, @Query() query: any) {
    const result = await this.companiesService.findAll(user.tenantId, query, scopeFilter(user, 'company'));
    return { success: true, ...result };
  }

  @Get(':id')
  @RequirePermission('companies.view')
  @ApiOperation({ summary: 'Get a single company with full details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const company = await this.companiesService.findOne(id, user.tenantId, scopeFilter(user, 'company'));
    return { success: true, data: company };
  }

  @Post()
  @RequirePermission('companies.create')
  @ApiOperation({ summary: 'Create a new company' })
  async create(@Body() dto: CreateCompanyDto, @CurrentUser() user: any) {
    const company = await this.companiesService.create(dto, user.tenantId, user.id);
    return { success: true, data: company, message: 'Company created successfully' };
  }

  @Patch(':id')
  @RequirePermission('companies.update')
  @ApiOperation({ summary: 'Update a company' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: any,
  ) {
    const company = await this.companiesService.update(id, dto, user.tenantId, user.id, scopeFilter(user, 'company'));
    return { success: true, data: company, message: 'Company updated successfully' };
  }

  @Delete(':id')
  @RequirePermission('companies.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a company' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const result = await this.companiesService.remove(id, user.tenantId, user.id, scopeFilter(user, 'company'));
    return { success: true, data: result, message: 'Company deleted' };
  }

  @Patch('bulk/update')
  @RequirePermission('companies.update')
  @ApiOperation({ summary: 'Bulk update multiple companies' })
  async bulkUpdate(
    @Body() body: { ids: string[]; data: { ownerId?: string; status?: string } },
    @CurrentUser() user: any,
  ) {
    const result = await this.companiesService.bulkUpdate(body.ids, body.data, user.tenantId);
    return { success: true, data: result };
  }

  @Delete('bulk/delete')
  @RequirePermission('companies.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete multiple companies' })
  async bulkDelete(@Body('ids') ids: string[], @CurrentUser() user: any) {
    const result = await this.companiesService.bulkDelete(ids, user.tenantId);
    return { success: true, data: result };
  }
}
