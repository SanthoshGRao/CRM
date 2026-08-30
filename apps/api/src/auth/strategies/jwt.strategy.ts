import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { computeEntitlement } from '../../common/billing/entitlement.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('app.jwt.accessSecret') || 'default-access-secret',
      ignoreExpiration: false,
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    tenantId: string;
    sessionId: string;
    permissions: string[];
    dataScope?: string;
    impersonatedBy?: string;
  }) {
    // Verify session is still valid
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session has expired or been revoked.');
    }

    // Verify user is still active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        status: true,
        tenantId: true,
        tenant: { select: { subscription: true } },
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Account is not active.');
    }

    const entitlement = computeEntitlement(user.tenant?.subscription ?? null);

    return {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      sessionId: payload.sessionId,
      permissions: payload.permissions,
      // Drives record-level visibility; defaults to the whole workspace so a
      // token minted before scoping existed never hides data unexpectedly.
      dataScope: payload.dataScope ?? 'COMPANY',
      impersonatedBy: payload.impersonatedBy,
      isEntitled: entitlement.entitled,
      entitlementReason: entitlement.reason,
    };
  }
}
