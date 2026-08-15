import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common'; import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'; import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; import { CurrentUser } from '../auth/decorators/current-user.decorator'; import { TenantsService } from './tenants.service';
@ApiTags('tenants') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('tenants')
export class TenantsController { constructor(private readonly tenantsService: TenantsService) {}
  @Get('me') async getMyTenant(@CurrentUser() user: any) { const data = await this.tenantsService.findOne(user.tenantId); return { success: true, data }; }
  @Patch('me/settings') async updateSettings(@CurrentUser() user: any, @Body() body: any) { const data = await this.tenantsService.updateSettings(user.tenantId, body); return { success: true, data }; }
}
