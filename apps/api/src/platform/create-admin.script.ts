/**
 * Creates (or updates the password of) a platform admin.
 *
 *   pnpm --filter @crm/api admin:create -- <email> <password> [firstName] [lastName]
 *
 * There is deliberately no HTTP route for this — the first admin must be made
 * from a shell with database access.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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

  const [email, password, firstName = 'Platform', lastName = 'Admin'] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Usage: admin:create -- <email> <password> [firstName] [lastName]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const admin = await prisma.platformAdmin.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase(), passwordHash, firstName, lastName, status: 'active' },
      update: { passwordHash, status: 'active' },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    console.log(`Platform admin ready: ${admin.email} (${admin.id})`);
    console.log('Sign in at http://147.93.108.218:3002/admin/login');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
