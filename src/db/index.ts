import 'server-only';
import { drizzle as drizzleNeon, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import * as schema from './schema';

type Db = NeonHttpDatabase<typeof schema>;

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env.local (see .env.example) — create a free Postgres at https://neon.tech.',
    );
  }
  // Production (Vercel + Neon) uses the serverless HTTP driver; any other
  // Postgres (local dev, docker) falls back to node-postgres. The two drizzle
  // instances share the same query API surface.
  if (/neon\.tech/.test(url)) {
    return drizzleNeon(neon(url), { schema });
  }
  // Conservative pool: `next build` spawns many worker processes, each with
  // its own pool — small max + fast idle release keeps local Postgres under
  // its connection cap. (Prod uses the Neon HTTP driver: no held connections.)
  return drizzlePg(
    new Pool({
      connectionString: url,
      max: 2,
      idleTimeoutMillis: 5_000,
      allowExitOnIdle: true,
    }),
    { schema },
  ) as unknown as Db;
}

let instance: Db | null = null;

// Lazy proxy: defers connecting (and the missing-env error) to the first
// query instead of module evaluation, so `next build` can import pages that
// never end up querying (e.g. generateStaticParams fallback paths).
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= createDb();
    return Reflect.get(instance, prop);
  },
});
