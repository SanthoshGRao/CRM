/**
 * Script to clear all admins, members, and records from the CRM database,
 * then create a new Platform Admin and Tenant Owner admin with specified credentials.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PERMISSION_CATALOGUE, ROLE_DEFINITIONS } from '../common/rbac/role-definitions';

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

  const targetEmail = 'santhosh@envisiontechsol.in';
  const targetPass = 'santhosh@2003';

  console.log('--- Clearing entire CRM database ---');

  try {
    // 1. Delete all existing records in reverse dependency order
    await prisma.auditLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.workflowExecution.deleteMany({});
    await prisma.workflow.deleteMany({});
    await prisma.customFieldValue.deleteMany({});
    await prisma.customFieldOption.deleteMany({});
    await prisma.customField.deleteMany({});
    await prisma.activity.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.deal.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.pipelineStage.deleteMany({});
    await prisma.pipeline.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.rolePermission.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.emailVerification.deleteMany({});
    await prisma.passwordReset.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.apiKey.deleteMany({});
    await prisma.tenantDomain.deleteMany({});
    await prisma.tenantFeature.deleteMany({});
    await prisma.tenantSettings.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.plan.deleteMany({});
    await prisma.savedView.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.platformAdmin.deleteMany({});

    console.log('Database cleared successfully.');

    // 2. Hash password using Argon2id
    const passwordHash = await argon2.hash(targetPass, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 3. Create Platform Admin
    const platformAdmin = await prisma.platformAdmin.create({
      data: {
        email: targetEmail.toLowerCase(),
        passwordHash,
        firstName: 'Santhosh',
        lastName: 'Admin',
        status: 'active',
      },
    });
    console.log(`Created Platform Admin: ${platformAdmin.email} (${platformAdmin.id})`);

    // 4. Create Default Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Envision Techsol',
        slug: 'envision-techsol',
        status: 'active',
        createdById: platformAdmin.id,
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
              { feature: 'whatsapp', enabled: true },
              { feature: 'automation', enabled: true },
              { feature: 'ai', enabled: true },
              { feature: 'calling', enabled: true },
            ],
          },
        },
      },
    });
    console.log(`Created Tenant: ${tenant.name} (${tenant.id})`);

    // 5. Seed Permission catalogue
    const rows = PERMISSION_CATALOGUE.flatMap((p) =>
      p.actions.map((action) => ({ resource: p.resource, action, description: p.description })),
    );
    await prisma.permission.createMany({ data: rows, skipDuplicates: true });
    const permissions = await prisma.permission.findMany({ select: { id: true, resource: true, action: true } });
    const idFor = new Map(permissions.map((p) => [`${p.resource}.${p.action}`, p.id]));

    // 6. Create Roles & RolePermissions for the tenant
    for (const definition of ROLE_DEFINITIONS) {
      const role = await prisma.role.create({
        data: {
          tenantId: tenant.id,
          name: definition.name,
          description: definition.description,
          dataScope: definition.dataScope,
          isSystem: true,
        },
      });

      await prisma.rolePermission.createMany({
        data: definition.permissions
          .map((p) => idFor.get(p))
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }

    const adminRole = await prisma.role.findFirst({
      where: { tenantId: tenant.id, name: 'Developer' },
    });

    if (adminRole) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }

    // 7. Create User with role = Developer
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: targetEmail.toLowerCase(),
        passwordHash,
        firstName: 'Santhosh',
        lastName: 'Developer',
        status: 'active',
        isEmailVerified: true,
        userRoles: adminRole
          ? {
              create: { roleId: adminRole.id },
            }
          : undefined,
      },
    });
    console.log(`Created Tenant User with Role 'Developer': ${user.email} (${user.id})`);

    // 8. Create Default Pipeline
    await prisma.pipeline.create({
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

    console.log('\n--- Database Reset & Seed Complete ---');
    console.log(`Admin Email: ${targetEmail}`);
    console.log(`Admin Password: ${targetPass}`);
  } catch (err) {
    console.error('Error resetting database:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
