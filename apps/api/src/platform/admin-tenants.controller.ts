import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Res,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FastifyReply } from 'fastify';
import { PlatformJwtGuard } from './guards/platform-jwt.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminTenantsService } from './admin-tenants.service';
import { setRefreshCookie } from '../auth/refresh-cookie';
import {
  CreateTenantDto, UpdateTenantDto, CreateTenantUserDto,
  UpsertSubscriptionDto, ToggleFeatureDto, CreateDomainDto, UpdateDomainDto,
} from './dto/admin-tenant.dto';

@ApiTags('platform-tenants')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard)
@Controller('admin/tenants')
export class AdminTenantsController {
  constructor(
    private readonly adminTenantsService: AdminTenantsService,
    private readonly config: ConfigService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide totals' })
  async stats() {
    const data = await this.adminTenantsService.stats();
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'List customer companies' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(@Query() query: any) {
    const result = await this.adminTenantsService.findAll(query);
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Customer company detail with users and API keys' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminTenantsService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Provision a customer company and its first Owner user' })
  async create(@Body() dto: CreateTenantDto, @CurrentAdmin('id') adminId: string) {
    const data = await this.adminTenantsService.create(dto, adminId);
    return { success: true, data, message: 'Customer company created' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer company (name, plan, status)' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    const data = await this.adminTenantsService.update(id, dto);
    return { success: true, data, message: 'Customer company updated' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a customer company and all of its data' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminTenantsService.remove(id);
    return { success: true, data, message: 'Customer company deleted' };
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Add a user to a customer workspace' })
  async createUser(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTenantUserDto) {
    const data = await this.adminTenantsService.createUser(id, dto);
    return { success: true, data, message: 'User added' };
  }

  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a user from a customer workspace' })
  async removeUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const data = await this.adminTenantsService.removeUser(id, userId);
    return { success: true, data, message: 'User removed' };
  }

  @Post(':id/access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Open a customer workspace as staff (returns a CRM token)' })
  async access(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin('id') adminId: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { refreshToken, refreshExpiresAt, ...data } =
      await this.adminTenantsService.createAccessToken(id, adminId);

    // Same cookie a normal login sets, so the workspace survives a reload.
    const maxAge = Math.max(0, Math.floor((refreshExpiresAt.getTime() - Date.now()) / 1000));
    setRefreshCookie(res, this.config, refreshToken, maxAge);

    return { success: true, data };
  }

  // ─── Subscription ──────────────────────────────────────────────────────

  @Post(':id/subscription')
  @ApiOperation({ summary: 'Assign or change a workspace subscription (upgrade/downgrade)' })
  async upsertSubscription(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertSubscriptionDto) {
    const data = await this.adminTenantsService.upsertSubscription(id, dto);
    return { success: true, data, message: 'Subscription updated' };
  }

  @Post(':id/subscription/cancel')
  @ApiOperation({ summary: 'Cancel a workspace subscription' })
  async cancelSubscription(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminTenantsService.cancelSubscription(id);
    return { success: true, data, message: 'Subscription cancelled' };
  }

  // ─── Feature flags ─────────────────────────────────────────────────────

  @Patch(':id/features/:feature')
  @ApiOperation({ summary: 'Enable or disable a feature for a workspace' })
  async setFeature(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('feature') feature: string,
    @Body() dto: ToggleFeatureDto,
  ) {
    const data = await this.adminTenantsService.setFeature(id, feature, dto);
    return { success: true, data };
  }

  // ─── Custom domains ────────────────────────────────────────────────────

  @Post(':id/domains')
  @ApiOperation({ summary: 'Attach a custom domain to a workspace' })
  async addDomain(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateDomainDto) {
    const data = await this.adminTenantsService.addDomain(id, dto);
    return { success: true, data, message: 'Domain added' };
  }

  @Patch(':id/domains/:domainId')
  @ApiOperation({ summary: 'Update a workspace domain (primary / verified)' })
  async updateDomain(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: UpdateDomainDto,
  ) {
    const data = await this.adminTenantsService.updateDomain(id, domainId, dto);
    return { success: true, data };
  }

  @Delete(':id/domains/:domainId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a workspace domain' })
  async removeDomain(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ) {
    const data = await this.adminTenantsService.removeDomain(id, domainId);
    return { success: true, data, message: 'Domain removed' };
  }
}
