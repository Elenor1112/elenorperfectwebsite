import 'server-only';
import { unstable_cache } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import {
  settingsSchemas,
  type SettingsKey,
  type SettingsValue,
} from '@/lib/validation/settings';

async function fetchSetting<K extends SettingsKey>(key: K): Promise<SettingsValue<K>> {
  const schema = settingsSchemas[key];
  let value: unknown = {};
  try {
    const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    value = row?.value ?? {};
  } catch {
    // DB unreachable → serve schema defaults (original launch content).
  }
  const parsed = schema.safeParse(value);
  return (parsed.success ? parsed.data : schema.parse({})) as SettingsValue<K>;
}

export function getSetting<K extends SettingsKey>(key: K): Promise<SettingsValue<K>> {
  return unstable_cache(() => fetchSetting(key), [`setting:${key}`], {
    tags: [`setting:${key}`],
  })();
}

export const getSiteSettings = () => getSetting('site');
export const getThemeSettings = () => getSetting('theme');
export const getAnalyticsSettings = () => getSetting('analytics');
export const getContactSettings = () => getSetting('contact');
export const getWorkSettings = () => getSetting('work');
