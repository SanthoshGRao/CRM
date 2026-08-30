import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { broadestScope, type DataScope } from '../common/rbac/role-definitions';
import { computeEntitlement, daysLeftInTrial } from '../common/billing/entitlement.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/** Everything needed to mint an access token and describe a session. */
const USER_SESSION_INCLUDE = {
  tenant: { include: { subscription: { include: { plan: true } }, settings: true } },
  userRoles: {
    include: {
      role: { include: { rolePermissions: { include: { permission: true } } } },
    },
  },
} as const;

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * A page reload fires several API calls at once, so two of them can race to
 * redeem the same refresh token. Re-accepting a token this recently rotated
 * turns that race into a no-op instead of signing the user out.
 */
const ROTATION_GRACE_MS = 30 * 1000;

/** Marker written to Session.userAgent when platform staff open a workspace. */
const IMPERSONATION_PREFIX = 'platform-admin:';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    // Check if email already registered in any tenant
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const slug = this.generateSlug(dto.companyName);

    // Create tenant + owner user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          slug: await this.uniqueSlug(slug, tx),
          status: 'active',
          settings: {
            create: {
              timezone: 'Asia/Kolkata',
              locale: 'en',
              dateFormat: 'DD/MM/YYYY',
              currency: 'INR',
            },
          },
          features: {
            createMany: {
              data: [
                { feature: 'crm', enabled: true },
                { feature: 'whatsapp', enabled: false },
                { feature: 'automation', enabled: false },
                { feature: 'ai', enabled: false },
                { feature: 'calling', enabled: false },
              ],
            },
          },
        },
      });

      // 2. Create Owner Role
      const ownerRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Owner',
          description: 'Full access to all tenant resources',
          isSystem: true,
          dataScope: 'COMPANY',
        },
      });

      // 2b. Grant the Owner every permission — without this the access token
      // carries an empty permission set and every guarded endpoint returns 403.
      const allPermissions = await tx.permission.findMany({ select: { id: true } });
      if (allPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: allPermissions.map((p) => ({ roleId: ownerRole.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }

      // 3. Create User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: 'active',
          isEmailVerified: false,
          userRoles: {
            create: { roleId: ownerRole.id },
          },
        },
      });

      // 4. Create default Sales pipeline
      await tx.pipeline.create({
        data: {
          tenantId: tenant.id,
          name: 'Sales Pipeline',
          entityType: 'lead',
          isDefault: true,
          stages: {
            createMany: {
              data: [
                { name: 'New', color: '#94a3b8', probability: 10, displayOrder: 1 },
                { name: 'Contacted', color: '#60a5fa', probability: 20, displayOrder: 2 },
                { name: 'Qualified', color: '#a78bfa', probability: 40, displayOrder: 3 },
                { name: 'Proposal', color: '#f59e0b', probability: 60, displayOrder: 4 },
                { name: 'Negotiation', color: '#fb923c', probability: 80, displayOrder: 5 },
                { name: 'Won', color: '#22c55e', probability: 100, displayOrder: 6, isWon: true },
                { name: 'Lost', color: '#ef4444', probability: 0, displayOrder: 7, isLost: true },
              ],
            },
          },
        },
      });

      // 5. Create email verification token
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      await tx.emailVerification.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      return { user, tenant, rawToken };
    });

    // TODO: Send verification email via email service
    this.logger.log(`New tenant registered: ${result.tenant.name} (${result.tenant.id})`);

    return {
      message: 'Registration successful. Please verify your email.',
      userId: result.user.id,
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
      include: USER_SESSION_INCLUDE,
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Your account has been suspended. Contact support.');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Build permission set and effective data scope
    const { permissions, dataScope } = this.resolveAccess(user);

    // Create session
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    // Generate tokens
    const accessToken = await this.generateAccessToken(user, session.id, permissions, dataScope);
    const { refreshToken, tokenHash } = this.generateRefreshToken();

    // Store hashed refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        sessionId: session.id,
        expiresAt,
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      session: this.buildSessionPayload(user, permissions, dataScope),
    };
  }

  // ─── Current Session ─────────────────────────────────────────────────────

  /**
   * Rebuilds the full session payload for an already-authenticated user, so a
   * client restoring itself after a reload picks up current roles and
   * permissions instead of trusting whatever it had cached.
   */
  async getSession(userId: string, impersonatedBy?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: USER_SESSION_INCLUDE,
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Account is not active.');
    }

    const { permissions, dataScope } = this.resolveAccess(user);
    const impersonation = await this.describeImpersonation(impersonatedBy);

    return this.buildSessionPayload(user, permissions, dataScope, impersonation);
  }

  // ─── Refresh Token ───────────────────────────────────────────────────────

  async refreshTokens(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const now = new Date();

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: USER_SESSION_INCLUDE } },
    });

    if (!storedToken || storedToken.expiresAt < now) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    if (storedToken.revokedAt) {
      // Concurrent refreshes from a single reload are expected; anything older
      // is a replay of a token that should have been discarded.
      if (now.getTime() - storedToken.revokedAt.getTime() > ROTATION_GRACE_MS) {
        await this.revokeFamily(storedToken.sessionId, storedToken.userId);
        this.logger.warn(
          `Refresh token reuse detected for user ${storedToken.userId}; session revoked.`,
        );
        throw new UnauthorizedException('Invalid or expired refresh token.');
      }
    }

    // A revoked or expired session must not be revivable by a refresh token —
    // that is what makes logout-all and password resets actually stick.
    const session = storedToken.sessionId
      ? await this.prisma.session.findUnique({ where: { id: storedToken.sessionId } })
      : null;

    if (!session || session.revokedAt || session.expiresAt < now) {
      throw new UnauthorizedException('Session has expired or been revoked.');
    }

    const user = storedToken.user;
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active.');
    }

    // Revoke used token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: storedToken.revokedAt ?? now, usedAt: now },
    });

    const { permissions, dataScope } = this.resolveAccess(user);

    // Staff working inside a customer workspace keep that marker across a
    // reload, and their access still ends when the 8h session does.
    const impersonatedBy = this.impersonatorFromSession(session.userAgent);

    const accessToken = await this.generateAccessToken(
      user,
      session.id,
      permissions,
      dataScope,
      impersonatedBy,
    );
    const { refreshToken: newRefreshToken, tokenHash: newHash } = this.generateRefreshToken();

    // Never outlive the session the token belongs to.
    const expiresAt = new Date(
      Math.min(now.getTime() + REFRESH_TOKEN_TTL_MS, session.expiresAt.getTime()),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newHash,
        sessionId: session.id,
        expiresAt,
      },
    });

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: now },
    });

    return { accessToken, refreshToken: newRefreshToken, expiresAt };
  }

  private async revokeFamily(sessionId: string | null, userId: string) {
    if (sessionId) {
      await this.prisma.$transaction([
        this.prisma.refreshToken.updateMany({
          where: { sessionId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        this.prisma.session.updateMany({
          where: { id: sessionId },
          data: { revokedAt: new Date() },
        }),
      ]);
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ─── Logout ──────────────────────────────────────────────────────────────

  async logout(sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    await this.prisma.refreshToken.updateMany({
      where: { sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });
    // Always return success (don't reveal if email exists)
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send reset email
    this.logger.log(`Password reset requested for ${email}`);
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
      // Revoke all sessions for security
      this.prisma.session.updateMany({
        where: { userId: resetRecord.userId },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ─── Email Verification ──────────────────────────────────────────────────

  async verifyEmail(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const verification = await this.prisma.emailVerification.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!verification || verification.usedAt || verification.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { isEmailVerified: true },
      }),
      this.prisma.emailVerification.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Permission set and effective data scope for a user loaded with roles. */
  private resolveAccess(user: any) {
    const permissions = new Set<string>();
    user.userRoles.forEach((ur: any) => {
      ur.role.rolePermissions.forEach((rp: any) => {
        permissions.add(`${rp.permission.resource}.${rp.permission.action}`);
      });
    });

    return {
      permissions: [...permissions],
      dataScope: broadestScope(user.userRoles.map((ur: any) => ur.role.dataScope as DataScope)),
    };
  }

  /** The session shape the web client stores — identical for login and refresh. */
  private buildSessionPayload(
    user: any,
    permissions: string[],
    dataScope: DataScope,
    impersonation?: { by: string; adminId: string } | null,
  ) {
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        status: user.tenant.status,
        settings: user.tenant.settings
          ? {
              timezone: user.tenant.settings.timezone,
              locale: user.tenant.settings.locale,
              dateFormat: user.tenant.settings.dateFormat,
              currency: user.tenant.settings.currency,
              brandColor: user.tenant.settings.brandColor,
              emailFooter: user.tenant.settings.emailFooter,
            }
          : null,
      },
      roles: user.userRoles.map((ur: any) => ur.role.name),
      permissions,
      dataScope,
      billing: this.buildBillingSummary(user.tenant.subscription),
      ...(impersonation ? { impersonation } : {}),
    };
  }

  /** Plan/subscription summary for the nav bar — same shape the billing module returns. */
  private buildBillingSummary(subscription: any) {
    const entitlement = computeEntitlement(subscription);

    return {
      plan: subscription
        ? {
            id: subscription.plan.id,
            name: subscription.plan.name,
            price: subscription.plan.price,
            currency: subscription.plan.currency,
            interval: subscription.plan.interval,
          }
        : null,
      status: subscription?.status ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      isEntitled: entitlement.entitled,
      entitlementReason: entitlement.reason,
      daysLeft: daysLeftInTrial(subscription),
      seats: subscription?.seats ?? null,
    };
  }

  private impersonatorFromSession(userAgent: string | null): string | undefined {
    return userAgent?.startsWith(IMPERSONATION_PREFIX)
      ? userAgent.slice(IMPERSONATION_PREFIX.length)
      : undefined;
  }

  private async describeImpersonation(adminId?: string | null) {
    if (!adminId) return null;

    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    return {
      by: admin ? `${admin.firstName} ${admin.lastName}` : 'Platform admin',
      adminId,
    };
  }

  private async generateAccessToken(
    user: any,
    sessionId: string,
    permissions: string[],
    dataScope: DataScope = 'COMPANY',
    impersonatedBy?: string,
  ) {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        sessionId,
        permissions,
        dataScope,
        ...(impersonatedBy ? { impersonatedBy } : {}),
      },
      {
        secret: this.config.get('app.jwt.accessSecret'),
        expiresIn: this.config.get('app.jwt.accessExpiresIn'),
      },
    );
  }

  private generateRefreshToken() {
    const refreshToken = randomBytes(64).toString('hex');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    return { refreshToken, tokenHash };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  private async uniqueSlug(base: string, tx: any): Promise<string> {
    let slug = base;
    let counter = 0;
    while (true) {
      const existing = await tx.tenant.findUnique({ where: { slug } });
      if (!existing) return slug;
      counter++;
      slug = `${base}-${counter}`;
    }
  }
}
