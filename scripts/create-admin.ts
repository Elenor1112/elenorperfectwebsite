/**
 * Creates (or resets the password of) the first SUPER_ADMIN user.
 * Usage: npm run admin:create   (reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
 * from .env.local or the environment)
 */
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { createScriptDb } from './db';
import { users } from '../src/db/schema';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Super Admin';

  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set (.env.local)');
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');

  const db = createScriptDb();
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    await db
      .update(users)
      .set({ passwordHash, role: 'SUPER_ADMIN', isActive: true, updatedAt: new Date() })
      .where(eq(users.email, email));
    console.log(`Updated existing user ${email} (password reset, role SUPER_ADMIN).`);
  } else {
    await db.insert(users).values({ email, name, passwordHash, role: 'SUPER_ADMIN' });
    console.log(`Created SUPER_ADMIN ${email}.`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
