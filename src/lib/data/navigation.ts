import 'server-only';
import { unstable_cache } from 'next/cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { menuItems, menus } from '@/db/schema';

export type PublicMenuItem = {
  label: string;
  url: string;
  isExternal: boolean;
  openInNewTab: boolean;
};

async function fetchMenu(slug: string): Promise<PublicMenuItem[]> {
  const menu = await db.query.menus.findFirst({
    where: eq(menus.slug, slug),
    with: {
      items: {
        where: eq(menuItems.isEnabled, true),
        orderBy: [asc(menuItems.sortOrder)],
      },
    },
  });
  return (menu?.items ?? []).map((i) => ({
    label: i.label,
    url: i.url,
    isExternal: i.isExternal,
    openInNewTab: i.openInNewTab,
  }));
}

export function getMenu(slug: string): Promise<PublicMenuItem[]> {
  return unstable_cache(() => fetchMenu(slug), ['menu', slug], { tags: ['menus'] })();
}
