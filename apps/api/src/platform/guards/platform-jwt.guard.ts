import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

export const PLATFORM_TOKEN_TYPE = 'platform';

/**
 * Authenticates platform staff. Tokens are signed with a dedicated secret and
 * carry typ='platform', so a customer's CRM token cannot reach the admin API.
 */
@Injectable()
export class PlatformJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Admin authentication required.');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(header.slice(7), {
        secret: this.config.get<string>('app.jwt.platformSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired admin session.');
    }

    if (payload?.typ !== PLATFORM_TOKEN_TYPE) {
      throw new UnauthorizedException('This token is not valid for the admin API.');
    }

    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, firstName: true, lastName: true, status: true },
    });

    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedException('Admin account is not active.');
    }

    request.admin = admin;
    return true;
  }
}
