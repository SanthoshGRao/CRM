import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────

  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Self-service signup — disabled by default',
    description:
      'Customer companies are provisioned by platform staff via POST /admin/tenants. ' +
      'Set ALLOW_PUBLIC_REGISTRATION=true to re-enable open signup.',
  })
  async register(@Body() dto: RegisterDto) {
    if (!this.config.get<boolean>('app.allowPublicRegistration')) {
      throw new ForbiddenException(
        'Self-service signup is disabled. Contact your provider to have a workspace created.',
      );
    }

    const result = await this.authService.register(dto);
    return { success: true, data: result, message: result.message };
  }

  // ─── Login ───────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login and receive access token' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(dto, ipAddress, userAgent);

    // Set refresh token in HttpOnly cookie
    setRefreshCookie(res, this.config, result.refreshToken);

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        session: result.session,
      },
    };
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE_NAME];

    // Must be a real 401: clients treat any 2xx here as "session restored" and
    // would otherwise read an access token off a failure body.
    if (!refreshToken) {
      clearRefreshCookie(res, this.config);
      throw new UnauthorizedException('Not authenticated');
    }

    let result: { accessToken: string; refreshToken: string; expiresAt: Date };
    try {
      result = await this.authService.refreshTokens(refreshToken);
    } catch (err) {
      // The cookie we were handed is dead — drop it so the browser stops
      // replaying it on every reload.
      clearRefreshCookie(res, this.config);
      throw err;
    }

    const maxAge = Math.max(
      0,
      Math.floor((result.expiresAt.getTime() - Date.now()) / 1000),
    );
    setRefreshCookie(res, this.config, result.refreshToken, maxAge);

    return { success: true, data: { accessToken: result.accessToken } };
  }

  // ─── Me ──────────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user session' })
  async me(@CurrentUser() user: any) {
    // Returns the same shape as login so a client restoring a session after a
    // reload gets current roles/permissions rather than whatever it cached.
    const session = await this.authService.getSession(user.id, user.impersonatedBy);
    return { success: true, data: session };
  }

  // ─── Logout ──────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    await this.authService.logout(user.sessionId);
    clearRefreshCookie(res, this.config);
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions across all devices' })
  async logoutAll(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    await this.authService.logoutAll(user.id);
    clearRefreshCookie(res, this.config);
    return { success: true, message: 'Logged out from all devices' };
  }

  // ─── Password ────────────────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 300000 } })
  @ApiOperation({ summary: 'Send password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { success: true, message: 'If this email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { success: true, message: 'Password reset successfully. Please login.' };
  }

  // ─── Email Verification ──────────────────────────────────────────────────

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  async verifyEmail(@Body('token') token: string) {
    await this.authService.verifyEmail(token);
    return { success: true, message: 'Email verified successfully.' };
  }
}
