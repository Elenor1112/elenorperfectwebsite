'use server';

import { db } from '@/db';
import { settings } from '@/db/schema';
import { requireUser } from '@/server/auth/rbac';
import { revalidateSettings } from '@/lib/revalidate';
import { settingsSchemas, type SettingsKey } from '@/lib/validation/settings';
import { logAudit } from './audit';

export async function saveSettings(key: SettingsKey, value: unknown) {
  const user = await requireUser(key === 'theme' ? 'theme:write' : 'settings:write');
  const schema = settingsSchemas[key];
  if (!schema) return { ok: false as const, error: 'Unknown settings group' };

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid settings' };
  }

  await db
    .insert(settings)
    .values({ key, value: parsed.data as Record<string, unknown> })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: parsed.data as Record<string, unknown>, updatedAt: new Date() },
    });

  revalidateSettings(key);
  await logAudit(user.id, 'update', 'settings', key, key);
  return { ok: true as const };
}
