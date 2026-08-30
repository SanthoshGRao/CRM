import {
  Injectable, NotFoundException, ConflictException, BadRequestException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { DEFAULT_ROLE_NAME, OWNER_ROLE_NAME, sortRolesByRank } from '../common/rbac/role-definitions';
import { computeEntitlement, daysLeftInTrial } from '../common/billing/entitlement.util';
import { getMaxUsers } from '../common/billing/plan-limits.util';
import {
  CreateTenantDto, UpdateTenantDto, CreateTenantUserDto,
  UpsertSubscriptionDto, ToggleFeatureDto, CreateDomainDto, UpdateDomainDto,
} from './dto/admin-tenant.dto';

const LEAD_STAGES = [
  { name: 'New', color: '#94a3b8', probability: 10, displayOrder: 1 },
  { name: 'Contacted', color: '#60a5fa', probability: 20, displayOrder: 2 },
  { name: 'Qualified', color: '#a78bfa', probability: 40, displayOrder: 3 },
  { name: 'Proposal', color: '#f59e0b', probability: 60, displayOrder: 4 },
  { name: 'Negotiation', color: '#fb923c', probability: 80, displayOrder: 5 },
  { name: 'Won', color: '#22c55e', probability: 100, displayOrder: 6, isWon: true },
  { name: 'Lost', color: '#ef4444', probability: 0, displayOrder: 7, isLost: true },
];

const DEAL_STAGES = [
  { name: 'Discovery', color: '#94a3b8', probability: 10, displayOrder: 1 },
  { name: 'Proposal Sent', color: '#60a5fa', probability: 30, displayOrder: 2 },
  { name: 'Negotiation', color: '#f59e0b', probability: 60, displayOrder: 3 },
  { name: 'Contract Sent', color: '#a78bfa', probability: 85, displayOrder: 4 },
  { name: 'Won', color: '#22c55e', probability: 100, displayOrder: 5, isWon: true },
  { name: 'Lost', color: '#ef4444', probability: 0, displayOrder: 6, isLost: true },
];

@Injectable()
export class AdminTenantsService {
  private readonly logger = new Logger(AdminTenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly rolesService: RolesService,
  ) {}

  // ─── Listing ─────────────────────────────────────────────────────────────

  async findAll(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;

    const where: any = {};
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { users: true, contacts: true, companies: true, leads: true, deals: true, apiKeys: true },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Headline numbers for the provider console. Intentionally about customers
   * and staff — CRM figures belong inside a customer's own workspace.
   */
  async stats() {
    const [tenants, activeTenants, users, apiKeys] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'active' } }),
      this.prisma.user.count(),
      this.prisma.apiKey.count({ where: { revokedAt: null } }),
    ]);

    return { tenants, activeTenants, users, apiKeys };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        settings: true,
        features: true,
        domains: { orderBy: { createdAt: 'asc' } },
        subscription: { include: { plan: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        users: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, email: true, firstName: true, lastName: true, status: true,
            lastLoginAt: true, createdAt: true,
            userRoles: { include: { role: { select: { id: true, name: true } } } },
          },
        },
        // Drives the "add user" role picker — without this the console has to
        // guess role names, and a guess that misses fails the request.
        roles: { select: { id: true, name: true, description: true, dataScope: true } },
        apiKeys: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true,
            requestCount: true, revokedAt: true, createdAt: true,
          },
        },
        _count: {
          select: { users: true, contacts: true, companies: true, leads: true, deals: true, tasks: true, activities: true },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Customer company not found');

    return {
      ...tenant,
      roles: sortRolesByRank(tenant.roles).map((role) => ({
        ...role,
        isDefault: role.name === DEFAULT_ROLE_NAME,
      })),
    };
  }

  // ─── Provisioning ────────────────────────────────────────────────────────

  async create(dto: CreateTenantDto, adminId: string) {
    const email = dto.ownerEmail.toLowerCase();

    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with that email already exists.');
    }

    const passwordHash = await this.hash(dto.ownerPassword);
    const slug = await this.uniqueSlug(this.slugify(dto.name));

    const plan = dto.planId
      ? await this.prisma.plan.findUnique({ where: { id: dto.planId } })
      : null;
    if (dto.planId && !plan) {
      throw new NotFoundException('Plan not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug,
          status: (dto.status as any) ?? 'active',
          plan: plan ? plan.name : dto.plan,
          createdById: adminId,
          settings: {
            create: { timezone: 'Asia/Kolkata', locale: 'en', dateFormat: 'DD/MM/YYYY', currency: 'INR' },
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

      // Seeds Owner, Admin, Manager, Sales Rep and Viewer from the shared matrix
      // so every workspace has an identical, correct role set.
      const roleIds = await this.rolesService.provisionDefaultRoles(tenant.id, tx);
      const ownerRoleId = roleIds[OWNER_ROLE_NAME];

      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName: dto.ownerFirstName,
          lastName: dto.ownerLastName,
          status: 'active',
          isEmailVerified: true,
          userRoles: { create: { roleId: ownerRoleId } },
        },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      await tx.pipeline.create({
        data: {
          tenantId: tenant.id,
          name: 'Sales Pipeline',
          entityType: 'lead',
          isDefault: true,
          stages: { createMany: { data: LEAD_STAGES } },
        },
      });

      await tx.pipeline.create({
        data: {
          tenantId: tenant.id,
          name: 'Deal Pipeline',
          entityType: 'deal',
          isDefault: true,
          stages: { createMany: { data: DEAL_STAGES } },
        },
      });

      if (plan) {
        const trialDays = Number(this.config.get('app.billing.trialDays')) || 7;
        const start = new Date();
        const end = new Date(start.getTime() + trialDays * 24 * 60 * 60 * 1000);
        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: plan.id,
            status: 'trialing',
            // Admin-assigned plans start at full seat capacity — the tenant
            // only has to pay per-seat once they check out on their own.
            seats: getMaxUsers(plan.features as any) ?? 999,
            currentPeriodStart: start,
            currentPeriodEnd: end,
          },
        });
      }

      return { tenant, owner };
    });

    this.logger.log(`Customer company provisioned: ${result.tenant.name} by admin ${adminId}`);
    return result;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.ensureExists(id);
    return this.prisma.tenant.update({ where: { id }, data: { ...dto } as any });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.tenant.delete({ where: { id } });
    return { id };
  }

  // ─── Users inside a customer workspace ───────────────────────────────────

  async createUser(tenantId: string, dto: CreateTenantUserDto) {
    await this.ensureExists(tenantId);

    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email } });
    if (existing) throw new ConflictException('That email is already used in this workspace.');

    const roleName = dto.roleName ?? DEFAULT_ROLE_NAME;
    const role = await this.prisma.role.findFirst({ where: { tenantId, name: roleName } });
    if (!role) {
      const available = await this.prisma.role.findMany({
        where: { tenantId },
        select: { name: true },
      });
      throw new BadRequestException(
        `Role "${roleName}" does not exist in this workspace. ` +
          `Available roles: ${sortRolesByRank(available).map((r) => r.name).join(', ')}.`,
      );
    }

    const passwordHash = await this.hash(dto.password);

    return this.prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: 'active',
        isEmailVerified: true,
        userRoles: { create: { roleId: role.id } },
      },
      select: { id: true, email: true, firstName: true, lastName: true, status: true },
    });
  }

  async removeUser(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found in this workspace');

    const remaining = await this.prisma.user.count({ where: { tenantId } });
    if (remaining <= 1) {
      throw new BadRequestException('A workspace must keep at least one user.');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { id: userId };
  }

  // ─── Cross-tenant access ─────────────────────────────────────────────────

  /**
   * Issues a normal CRM access token for a customer workspace so staff can work
   * inside it. The token impersonates the workspace Owner (so every foreign key
   * stays valid) and records which admin opened the session.
   */
  async createAccessToken(tenantId: string, adminId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { settings: true, subscription: { include: { plan: true } } },
    });
    if (!tenant) throw new NotFoundException('Customer company not found');

    const owner = await this.prisma.user.findFirst({
      where: { tenantId, status: 'active' },
      orderBy: { createdAt: 'asc' },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
      },
    });
    if (!owner) throw new BadRequestException('This workspace has no active user to act as.');

    const permissions = new Set<string>();
    owner.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        permissions.add(`${rp.permission.resource}.${rp.permission.action}`);
      });
    });

    const sessionExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const session = await this.prisma.session.create({
      data: {
        userId: owner.id,
        // AuthService reads this marker back to keep the impersonation flag on
        // refreshed tokens.
        userAgent: `platform-admin:${adminId}`,
        expiresAt: sessionExpiresAt,
      },
    });

    // Staff need the same refresh cookie a normal login gets, or reloading the
    // workspace throws them out. It is capped to the 8h session, so this does
    // not extend how long the impersonation lasts.
    const refreshToken = randomBytes(64).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: owner.id,
        tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        sessionId: session.id,
        expiresAt: sessionExpiresAt,
      },
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: owner.id,
        email: owner.email,
        tenantId,
        sessionId: session.id,
        permissions: [...permissions],
        impersonatedBy: adminId,
      },
      {
        secret: this.config.get<string>('app.jwt.accessSecret'),
        expiresIn: (this.config.get<string>('app.jwt.platformExpiresIn') || '8h') as any,
      },
    );

    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true, email: true },
    });

    this.logger.warn(`Admin ${adminId} opened workspace ${tenant.name} (${tenantId})`);

    // Without this the client-side paywall gate defaults to "entitled" for a
    // session that has no billing block at all, so a workspace an admin opens
    // looks accessible even when the tenant itself is blocked on subscription.
    const entitlement = computeEntitlement(tenant.subscription);

    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: sessionExpiresAt,
      session: {
        user: {
          id: owner.id,
          email: owner.email,
          firstName: owner.firstName,
          lastName: owner.lastName,
          avatarUrl: owner.avatarUrl,
          isEmailVerified: owner.isEmailVerified,
        },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
        roles: owner.userRoles.map((ur) => ur.role.name),
        permissions: [...permissions],
        billing: {
          plan: tenant.subscription
            ? {
                id: tenant.subscription.plan.id,
                name: tenant.subscription.plan.name,
                price: tenant.subscription.plan.price,
                currency: tenant.subscription.plan.currency,
                interval: tenant.subscription.plan.interval,
              }
            : null,
          status: tenant.subscription?.status ?? null,
          currentPeriodEnd: tenant.subscription?.currentPeriodEnd ?? null,
          isEntitled: entitlement.entitled,
          entitlementReason: entitlement.reason,
          daysLeft: daysLeftInTrial(tenant.subscription),
          seats: tenant.subscription?.seats ?? null,
        },
        impersonation: { by: admin ? `${admin.firstName} ${admin.lastName}` : 'Platform admin', adminId },
      },
    };
  }

  // ─── Subscription ────────────────────────────────────────────────────────

  /** Creates or updates a tenant's subscription — covers first assignment, upgrade/downgrade, and un-cancelling. */
  async upsertSubscription(tenantId: string, dto: UpsertSubscriptionDto) {
    await this.ensureExists(tenantId);

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const start = dto.currentPeriodStart ? new Date(dto.currentPeriodStart) : new Date();
    const end = dto.currentPeriodEnd
      ? new Date(dto.currentPeriodEnd)
      : new Date(start.getTime() + (plan.interval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000);

    // Admin reassignment grants full seat capacity on the new plan — the
    // tenant only pays per-seat when it checks out for itself.
    const seats = getMaxUsers(plan.features as any) ?? 999;

    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planId: dto.planId,
        status: (dto.status as any) ?? 'trialing',
        seats,
        currentPeriodStart: start,
        currentPeriodEnd: end,
      },
      update: {
        planId: dto.planId,
        seats,
        ...(dto.status ? { status: dto.status as any, cancelledAt: dto.status === 'cancelled' ? new Date() : null } : {}),
        ...(dto.currentPeriodStart ? { currentPeriodStart: start } : {}),
        ...(dto.currentPeriodEnd ? { currentPeriodEnd: end } : {}),
      },
      include: { plan: true },
    });

    // Keeps the legacy Tenant.plan label in sync — some older UI still reads it directly.
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { plan: plan.name } });

    return subscription;
  }

  async cancelSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!subscription) throw new NotFoundException('This workspace has no subscription to cancel.');

    return this.prisma.subscription.update({
      where: { tenantId },
      data: { status: 'cancelled', cancelledAt: new Date() },
      include: { plan: true },
    });
  }

  // ─── Feature flags ───────────────────────────────────────────────────────

  async setFeature(tenantId: string, feature: string, dto: ToggleFeatureDto) {
    await this.ensureExists(tenantId);

    return this.prisma.tenantFeature.upsert({
      where: { tenantId_feature: { tenantId, feature } },
      create: { tenantId, feature, enabled: dto.enabled, config: dto.config },
      update: { enabled: dto.enabled, config: dto.config },
    });
  }

  // ─── Custom domains ──────────────────────────────────────────────────────

  async addDomain(tenantId: string, dto: CreateDomainDto) {
    await this.ensureExists(tenantId);

    const domain = dto.domain.toLowerCase();
    const existing = await this.prisma.tenantDomain.findUnique({ where: { domain } });
    if (existing) throw new ConflictException('That domain is already assigned to a workspace.');

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.tenantDomain.updateMany({ where: { tenantId }, data: { isPrimary: false } });
      }
      return tx.tenantDomain.create({
        data: { tenantId, domain, isPrimary: !!dto.isPrimary },
      });
    });
  }

  async updateDomain(tenantId: string, domainId: string, dto: UpdateDomainDto) {
    const domain = await this.prisma.tenantDomain.findFirst({ where: { id: domainId, tenantId } });
    if (!domain) throw new NotFoundException('Domain not found on this workspace');

    if (dto.isPrimary) {
      return this.prisma.$transaction(async (tx) => {
        await tx.tenantDomain.updateMany({ where: { tenantId }, data: { isPrimary: false } });
        return tx.tenantDomain.update({ where: { id: domainId }, data: dto });
      });
    }

    return this.prisma.tenantDomain.update({ where: { id: domainId }, data: dto });
  }

  async removeDomain(tenantId: string, domainId: string) {
    const domain = await this.prisma.tenantDomain.findFirst({ where: { id: domainId, tenantId } });
    if (!domain) throw new NotFoundException('Domain not found on this workspace');

    await this.prisma.tenantDomain.delete({ where: { id: domainId } });
    return { id: domainId };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async ensureExists(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Customer company not found');
  }

  private hash(password: string) {
    return argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
  }

  private slugify(name: string): string {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'workspace';
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let n = 1;
    while (await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${++n}`;
    }
    return slug;
  }
}
