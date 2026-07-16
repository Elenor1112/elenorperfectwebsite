/**
 * DEV helper: mints a session token for the first SUPER_ADMIN so smoke tests
 * can exercise authenticated admin routes. Prints the raw cookie value.
 * Usage: npx tsx scripts/dev-session.ts
 */
import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createScriptDb } from './db';
import { sessions, users } from '../src/db/schema';

async function main() {
  const db = createScriptDb();
  const admin = await db.query.users.findFirst({ where: eq(users.role, 'SUPER_ADMIN') });
  if (!admin) throw new Error('No SUPER_ADMIN user found — run db:seed first.');

  const token = randomBytes(32).toString('base64url');
  await db.insert(sessions).values({
    id: createHash('sha256').update(token).digest('hex'),
    userId: admin.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    userAgent: 'smoke-test',
  });
  console.log(token);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
