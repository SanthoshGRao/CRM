/**
 * Gives every tenant with no Subscription row a grace-period active one, so
 * the SubscriptionGuard hard-block doesn't lock out pre-existing customers
 * the moment it ships.
 *
 *   pnpm --filter @crm/api billing:backfill-subscriptions
 *
 * Safe to re-run: tenants that already have a Subscription are skipped.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const GRACE_PERIOD_DAYS = 30;

/** Minimal .env reader — Nest loads env via ConfigModule, but this runs standalone. */
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
    const tenants = await prisma.tenant.findMany({
      where: { subscription: null },
      select: { id: true, name: true, plan: true },
    });

    if (tenants.length === 0) {
      console.log('No tenants missing a subscription. Nothing to do.');
      return;
    }

    const plans = await prisma.plan.findMany({ where: { isActive: true } });
    const defaultPlan = plans[0] ?? null;

    if (!defaultPlan) {
      console.error('No active Plan exists to backfill with. Create one first.');
      process.exit(1);
    }

    const start = new Date();
    const end = new Date(start.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    for (const tenant of tenants) {
      const matched = tenant.plan
        ? plans.find((p) => p.name.toLowerCase() === tenant.plan!.toLowerCase())
        : null;
      const plan = matched ?? defaultPlan;

      await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: 'active',
          currentPeriodStart: start,
          currentPeriodEnd: end,
        },
      });

      console.log(
        `${tenant.name}: assigned "${plan.name}"${matched ? '' : ' (default — no match for legacy plan)'}, ` +
        `active until ${end.toISOString().slice(0, 10)}`,
      );
    }

    console.log(`\nDone. ${tenants.length} workspace(s) backfilled with a ${GRACE_PERIOD_DAYS}-day grace period.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
