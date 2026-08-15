import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformAuthService } from './platform-auth.service';
import { AdminLoginDto } from './dto/platform-auth.dto';
import { PlatformJwtGuard } from './guards/platform-jwt.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';

@ApiTags('platform-auth')
@Controller('admin/auth')
export class PlatformAuthController {
  constructor(private readonly platformAuthService: PlatformAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in as platform staff' })
  async login(@Body() dto: AdminLoginDto) {
    const data = await this.platformAuthService.login(dto);
    return { success: true, data };
  }

  @Get('me')
  @UseGuards(PlatformJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current platform admin' })
  async me(@CurrentAdmin('id') adminId: string) {
    const data = await this.platformAuthService.me(adminId);
    return { success: true, data };
  }

  @Post('logout')
  @UseGuards(PlatformJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out (client discards the token)' })
  async logout() {
    return { success: true, message: 'Signed out' };
  }
}
