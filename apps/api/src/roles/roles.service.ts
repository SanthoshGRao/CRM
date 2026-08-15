import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  PERMISSION_CATALOGUE, ROLE_DEFINITIONS, ALL_PERMISSIONS,
  getRoleDefinition, OWNER_ROLE_NAME,
} from '../common/rbac/role-definitions';

type Tx = { [K in keyof PrismaService]: PrismaService[K] } | any;

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Reading ─────────────────────────────────────────────────────────────

  async findAll(tenantId: string) {
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });

    const shaped = roles.map((role) => {
      const definition = getRoleDefinition(role.name);
      return {
        id: role.id,
        name: role.name,
        description: role.description,
        dataScope: role.dataScope,
        isSystem: role.isSystem,
        memberCount: role._count.userRoles,
        rank: definition?.rank ?? 99,
        permissions: role.rolePermissions
          .map((rp) => `${rp.permission.resource}.${rp.permission.action}`)
          .sort(),
      };
    });

    return shaped.sort((a, b) => a.rank - b.rank);
  }

  async findOne(id: string, tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId },
      include: {
        rolePermissions: { include: { permission: true } },
        userRoles: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });

    if (!role) throw new NotFoundException('Role not found');

    return {
      ...role,
      permissions: role.rolePermissions
        .map((rp) => `${rp.permission.resource}.${rp.permission.action}`)
        .sort(),
      members: role.userRoles.map((ur) => ur.user),
    };
  }

  /** The catalogue itself, so the UI can explain what each permission means. */
  catalogue() {
    return {
      permissions: PERMISSION_CATALOGUE,
      roles: ROLE_DEFINITIONS.map((r) => ({
        name: r.name,
        description: r.description,
        dataScope: r.dataScope,
        rank: r.rank,
        permissions: r.permissions,
      })),
    };
  }

  // ─── Provisioning ────────────────────────────────────────────────────────

  /**
   * Makes sure every permission in the catalogue exists as a row. Permissions
   * are global, so this runs once and is safe to repeat.
   */
  async syncPermissionCatalogue(tx: Tx = this.prisma) {
    const rows = PERMISSION_CATALOGUE.flatMap((p) =>
      p.actions.map((action) => ({ resource: p.resource, action, description: p.description })),
    );

    await tx.permission.createMany({ data: rows, skipDuplicates: true });

    return tx.permission.findMany({ select: { id: true, resource: true, action: true } });
  }

  /**
   * Creates the five seeded roles for a workspace and wires up their
   * permissions. Idempotent: existing roles are re-synced rather than
   * duplicated, so a tenant provisioned before a matrix change catches up.
   */
  async provisionDefaultRoles(tenantId: string, tx: Tx = this.prisma) {
    const permissions = await this.syncPermissionCatalogue(tx);

    const idFor = new Map(permissions.map((p: any) => [`${p.resource}.${p.action}`, p.id]));
    const created: Record<string, string> = {};

    for (const definition of ROLE_DEFINITIONS) {
      const existing = await tx.role.findFirst({
        where: { tenantId, name: definition.name },
        select: { id: true },
      });

      const role = existing
        ? await tx.role.update({
            where: { id: existing.id },
            data: { description: definition.description, dataScope: definition.dataScope, isSystem: true },
            select: { id: true },
          })
        : await tx.role.create({
            data: {
              tenantId,
              name: definition.name,
              description: definition.description,
              dataScope: definition.dataScope,
              isSystem: true,
            },
            select: { id: true },
          });

      created[definition.name] = role.id;

      // Replace the permission set so the role always matches the matrix.
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.rolePermission.createMany({
        data: definition.permissions
          .map((p) => idFor.get(p) as string | undefined)
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }

    return created;
  }

  /** Role id to hand a brand-new workspace owner. */
  async ownerRoleId(tenantId: string, tx: Tx = this.prisma): Promise<string> {
    const role = await tx.role.findFirst({
      where: { tenantId, name: OWNER_ROLE_NAME },
      select: { id: true },
    });
    if (!role) throw new NotFoundException('Owner role missing for this workspace');
    return role.id;
  }

  /** Backfills every existing tenant — used by the rbac:sync script. */
  async syncAllTenants() {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true, name: true } });
    const summary: Array<{ tenant: string; roles: number }> = [];

    for (const tenant of tenants) {
      const roles = await this.provisionDefaultRoles(tenant.id);
      summary.push({ tenant: tenant.name, roles: Object.keys(roles).length });
      this.logger.log(`Synced roles for ${tenant.name}`);
    }

    return { tenants: summary, permissions: ALL_PERMISSIONS.length };
  }
}
