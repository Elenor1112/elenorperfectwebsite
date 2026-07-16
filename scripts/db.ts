// Shared DB client for CLI scripts (seed, create-admin). Mirrors src/db but
// without 'server-only' so it can run under tsx.
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { drizzle as drizzleNeon, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';

export type ScriptDb = NeonHttpDatabase<typeof schema>;

export function createScriptDb(): ScriptDb {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set — add it to .env.local (see .env.example).');
    process.exit(1);
  }
  if (/neon\.tech/.test(url)) {
    return drizzleNeon(neon(url), { schema });
  }
  return drizzlePg(new Pool({ connectionString: url, max: 5 }), {
    schema,
  }) as unknown as ScriptDb;
}
