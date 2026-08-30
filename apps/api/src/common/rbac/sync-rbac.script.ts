/**
 * Syncs the permission catalogue and seeded roles into every existing tenant.
 *
 *   pnpm --filter @crm/api rbac:sync
 *
 * Safe to re-run: permissions are upserted, and each workspace's roles are
 * rebuilt to match the matrix in role-definitions.ts. Run it after changing
 * that matrix so existing customers pick the change up.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PERMISSION_CATALOGUE, ROLE_DEFINITIONS, ALL_PERMISSIONS } from './role-definitions';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.trim().replace(/^["'](.*)["']$/, '$1');
    }
  }
}

async function main() {
  loadEnv();
  const prisma = new PrismaClient();

  try {
    // 1. Permission catalogue (global rows)
    const rows = PERMISSION_CATALOGUE.flatMap((p) =>
      p.actions.map((action) => ({ resource: p.resource, action, description: p.description })),
    );
    const created = await prisma.permission.createMany({ data: rows, skipDuplicates: true });
    console.log(`Permissions: ${ALL_PERMISSIONS.length} in catalogue, ${created.count} newly inserted.`);

    const permissions = await prisma.permission.findMany({ select: { id: true, resource: true, action: true } });
    const idFor = new Map(permissions.map((p) => [`${p.resource}.${p.action}`, p.id]));

    // 2. Roles per tenant
    const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
    console.log(`\nSyncing ${tenants.length} workspace(s):`);

    // Renamed roles: old seeded name -> new one. Renaming the existing row in
    // place (rather than creating a new one) keeps every UserRole pointed at
    // the same role id, so nobody's assignment silently disappears.
    const RENAMES: Array<[string, string]> = [['Admin', 'Developer']];

    for (const tenant of tenants) {
      for (const [fromName, toName] of RENAMES) {
        const hasNewName = await prisma.role.findFirst({
          where: { tenantId: tenant.id, name: toName },
          select: { id: true },
        });
        if (hasNewName) continue;

        const renamed = await prisma.role.updateMany({
          where: { tenantId: tenant.id, name: fromName },
          data: { name: toName },
        });
        if (renamed.count > 0) console.log(`  renamed "${fromName}" -> "${toName}" for ${tenant.name}`);
      }

      for (const definition of ROLE_DEFINITIONS) {
        const existing = await prisma.role.findFirst({
          where: { tenantId: tenant.id, name: definition.name },
          select: { id: true },
        });

        const role = existing
          ? await prisma.role.update({
              where: { id: existing.id },
              data: {
                description: definition.description,
                dataScope: definition.dataScope,
                isSystem: true,
              },
              select: { id: true },
            })
          : await prisma.role.create({
              data: {
                tenantId: tenant.id,
                name: definition.name,
                description: definition.description,
                dataScope: definition.dataScope,
                isSystem: true,
              },
              select: { id: true },
            });

        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
        await prisma.rolePermission.createMany({
          data: definition.permissions
            .map((p) => idFor.get(p))
            .filter((id): id is string => Boolean(id))
            .map((permissionId) => ({ roleId: role.id, permissionId })),
          skipDuplicates: true,
        });
      }

      // Retire the old placeholder role, moving anyone on it to Sales Rep.
      const legacy = await prisma.role.findFirst({
        where: { tenantId: tenant.id, name: 'Member' },
        select: { id: true },
      });
      if (legacy) {
        const salesRep = await prisma.role.findFirst({
          where: { tenantId: tenant.id, name: 'Sales Rep' },
          select: { id: true },
        });
        if (salesRep) {
          const moved = await prisma.userRole.updateMany({
            where: { roleId: legacy.id },
            data: { roleId: salesRep.id },
          });
          if (moved.count > 0) console.log(`  moved ${moved.count} user(s) off legacy "Member"`);
        }
        await prisma.role.delete({ where: { id: legacy.id } });
      }

      const summary = await prisma.role.findMany({
        where: { tenantId: tenant.id },
        select: { name: true, dataScope: true, _count: { select: { rolePermissions: true, userRoles: true } } },
        orderBy: { name: 'asc' },
      });

      console.log(`  ${tenant.name}:`);
      for (const r of summary) {
        console.log(
          `    ${r.name.padEnd(10)} scope=${String(r.dataScope).padEnd(8)} ` +
          `perms=${String(r._count.rolePermissions).padStart(2)} users=${r._count.userRoles}`,
        );
      }
    }

    console.log('\nDone. Users must sign in again to pick up new permissions in their token.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
