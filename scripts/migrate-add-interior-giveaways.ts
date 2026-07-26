/**
 * One-off, idempotent migration for the July 2026 content update:
 *
 *   • Coca-Cola      → add an Interior Design gallery
 *   • Renaissance Hotel (NEW case study) → Interior Design
 *   • CBRE (promoted from roster → case study) → Interior Design
 *   • Saint-Gobain   → add a Giveaways gallery
 *   • Zoetis         → add a Giveaways gallery
 *   • Al-Nesr Al-Jawhari → add a Giveaways gallery
 *
 * The live DB has admin edits the seed script won't touch (it's idempotent and
 * skips existing case studies), so this script applies the deltas directly.
 * Safe to re-run: every insert is guarded, existing rows are never overwritten
 * except the deliberate `services`/`categories` array merges (idempotent unions)
 * and roster deactivation.
 *
 * Usage: npx tsx scripts/migrate-add-interior-giveaways.ts
 * (reads DATABASE_URL from .env.local — run against the same DB the app uses)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { and, eq } from 'drizzle-orm';
import { createScriptDb } from './db';
import * as schema from '../src/db/schema';

const db = createScriptDb();
const PUBLIC_ASSETS = path.join(process.cwd(), 'public', 'assets');

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
};

// The galleries this migration adds. `dir` is relative to public/assets and is
// exactly `[client-slug]/[service-slug]` — matching the app's path convention.
type GallerySpec = {
  caseStudySlug: string; // existing OR newly-created case study
  label: string; // service display name (gallery label)
  serviceSlug: string; // must match the /services/[slug] the slider reads
  dir: string;
};

// New case studies to create (promoted/added clients). Cover = first image.
type NewCaseStudy = {
  slug: string;
  client: string;
  industry: string;
  industries: string[];
  services: string[];
  categories: string[];
  result: string;
  coverUrl: string;
  // If this client currently exists in roster_clients, deactivate it so it
  // doesn't show twice (roster grid + case-study card).
  demoteRosterName?: string;
};

const NEW_CASE_STUDIES: NewCaseStudy[] = [
  {
    slug: 'cbre-interior',
    client: 'CBRE',
    industry: 'Real Estate & Constructions',
    industries: ['Real Estate & Constructions'],
    services: ['Interior Design'],
    categories: ['Interior Design'],
    result: 'A refined interior fit-out for a global commercial real-estate leader.',
    coverUrl: '/assets/cbre/interior-design/01.jpg',
    demoteRosterName: 'CBRE',
  },
  {
    slug: 'renaissance-hotel-interior',
    client: 'Renaissance Hotel',
    industry: 'Hospitality',
    industries: ['Hospitality'],
    services: ['Interior Design'],
    categories: ['Interior Design'],
    result: 'A polished, hospitality-grade interior design brought to life across the property.',
    coverUrl: '/assets/renaissance-hotel/interior-design/01.webp',
  },
];

// Service tags to merge into existing case studies (so the new gallery's
// service also appears in the study's services/categories arrays).
const SERVICE_ADDITIONS: { slug: string; add: string }[] = [
  { slug: 'coca-cola', add: 'Interior Design' },
  { slug: 'saint-gobain-social', add: 'Giveaways' },
  { slug: 'zoetis-social', add: 'Giveaways' },
  { slug: 'al-nesr-al-jawhari', add: 'Giveaways' },
];

const GALLERIES: GallerySpec[] = [
  {
    caseStudySlug: 'coca-cola',
    label: 'Interior Design',
    serviceSlug: 'interior-design',
    dir: 'coca-cola/interior-design',
  },
  {
    caseStudySlug: 'cbre-interior',
    label: 'Interior Design',
    serviceSlug: 'interior-design',
    dir: 'cbre/interior-design',
  },
  {
    caseStudySlug: 'renaissance-hotel-interior',
    label: 'Interior Design',
    serviceSlug: 'interior-design',
    dir: 'renaissance-hotel/interior-design',
  },
  {
    caseStudySlug: 'saint-gobain-social',
    label: 'Giveaways',
    serviceSlug: 'giveaways',
    dir: 'saint-gobain/giveaways',
  },
  {
    caseStudySlug: 'zoetis-social',
    label: 'Giveaways',
    serviceSlug: 'giveaways',
    dir: 'zoetis/giveaways',
  },
  {
    caseStudySlug: 'al-nesr-al-jawhari',
    label: 'Giveaways',
    serviceSlug: 'giveaways',
    dir: 'al-nesr-al-jawhari/giveaways',
  },
];

/* ------------------------------ media helpers ------------------------------ */

// Ensure a media folder exists (client dir, then service child) and return the
// leaf folder id. Mirrors seed.ts folder handling.
async function ensureFolder(name: string, parentId: string | null): Promise<string> {
  const existing = await db.query.mediaFolders.findMany();
  const found = existing.find((f) => f.name === name && f.parentId === parentId);
  if (found) return found.id;
  const [row] = await db
    .insert(schema.mediaFolders)
    .values({ name, parentId })
    .returning({ id: schema.mediaFolders.id });
  return row.id;
}

// Register a single file as a media row if not already present (keyed by url).
// Returns the media id. Mirrors seed.ts alt/dimension derivation.
async function ensureMedia(relDir: string, filename: string, folderId: string): Promise<string> {
  const url = `/assets/${relDir}/${filename}`;
  const existing = await db.query.media.findFirst({ where: eq(schema.media.url, url) });
  if (existing) return existing.id;

  const abs = path.join(PUBLIC_ASSETS, relDir, filename);
  const ext = path.extname(filename).toLowerCase();
  const stat = fs.statSync(abs);
  let width: number | null = null;
  let height: number | null = null;
  try {
    const meta = await sharp(abs).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
  } catch {
    /* undecodable — dimensions stay null */
  }
  const alt = url
    .replace('/assets/', '')
    .replace(/\.[a-z0-9]+$/i, '')
    .split('/')
    .join(' — ')
    .replace(/-/g, ' ');

  const [row] = await db
    .insert(schema.media)
    .values({
      folderId,
      filename,
      url,
      storage: 'local',
      mimeType: MIME[ext] ?? 'application/octet-stream',
      sizeBytes: stat.size,
      width,
      height,
      alt,
    })
    .returning({ id: schema.media.id });
  return row.id;
}

// Register every image in a gallery dir (sorted) and return their media ids.
async function ensureGalleryMedia(dirRel: string): Promise<string[]> {
  const [clientName, svcName] = dirRel.split('/');
  const clientFolder = await ensureFolder(clientName, null);
  const svcFolder = await ensureFolder(svcName, clientFolder);
  const dirAbs = path.join(PUBLIC_ASSETS, dirRel);
  const files = fs
    .readdirSync(dirAbs)
    .filter((f) => MIME[path.extname(f).toLowerCase()])
    .sort();
  const ids: string[] = [];
  for (const f of files) ids.push(await ensureMedia(dirRel, f, svcFolder));
  return ids;
}

/* ------------------------------- main steps -------------------------------- */

async function createNewCaseStudies() {
  // Next sortOrder = after the current max, so new studies land at the end.
  const all = await db.select({ sortOrder: schema.caseStudies.sortOrder }).from(schema.caseStudies);
  let nextOrder = all.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1;

  for (const cs of NEW_CASE_STUDIES) {
    const exists = await db.query.caseStudies.findFirst({
      where: eq(schema.caseStudies.slug, cs.slug),
    });
    if (exists) {
      console.log(`· Case study ${cs.slug} already exists — skipping create`);
      continue;
    }
    const coverId =
      (await db.query.media.findFirst({ where: eq(schema.media.url, cs.coverUrl) }))?.id ?? null;

    await db.insert(schema.caseStudies).values({
      slug: cs.slug,
      client: cs.client,
      industry: cs.industry,
      industries: cs.industries,
      services: cs.services,
      categories: cs.categories,
      result: cs.result,
      coverImageId: coverId,
      sortOrder: nextOrder++,
      status: 'published',
    });
    console.log(`✓ Created case study ${cs.slug}${coverId ? ' (with cover)' : ''}`);

    if (cs.demoteRosterName) {
      const res = await db
        .update(schema.rosterClients)
        .set({ isActive: false })
        .where(
          and(
            eq(schema.rosterClients.name, cs.demoteRosterName),
            eq(schema.rosterClients.isActive, true),
          ),
        )
        .returning({ id: schema.rosterClients.id });
      if (res.length > 0) console.log(`  · Deactivated roster entry "${cs.demoteRosterName}"`);
    }
  }
}

async function mergeServiceTags() {
  for (const { slug, add } of SERVICE_ADDITIONS) {
    const row = await db.query.caseStudies.findFirst({
      where: eq(schema.caseStudies.slug, slug),
    });
    if (!row) {
      console.log(`· ${slug} not found — skipping service merge`);
      continue;
    }
    const services = row.services.includes(add) ? row.services : [...row.services, add];
    const categories = row.categories.includes(add) ? row.categories : [...row.categories, add];
    if (services.length === row.services.length && categories.length === row.categories.length) {
      console.log(`· ${slug} already tagged "${add}" — no change`);
      continue;
    }
    await db
      .update(schema.caseStudies)
      .set({ services, categories })
      .where(eq(schema.caseStudies.id, row.id));
    console.log(`✓ Tagged ${slug} with "${add}"`);
  }
}

async function createGalleries() {
  for (const g of GALLERIES) {
    const cs = await db.query.caseStudies.findFirst({
      where: eq(schema.caseStudies.slug, g.caseStudySlug),
    });
    if (!cs) {
      console.log(`· Case study ${g.caseStudySlug} missing — skipping gallery "${g.label}"`);
      continue;
    }

    const dirAbs = path.join(PUBLIC_ASSETS, g.dir);
    if (!fs.existsSync(dirAbs)) {
      console.log(`· Dir ${g.dir} missing on disk — skipping gallery`);
      continue;
    }

    // Idempotent: skip if a gallery with this serviceSlug already exists for the
    // study (matches how the app identifies a service's gallery).
    const existingGalleries = await db.query.caseStudyGalleries.findMany({
      where: eq(schema.caseStudyGalleries.caseStudyId, cs.id),
    });
    if (existingGalleries.some((x) => x.serviceSlug === g.serviceSlug)) {
      console.log(`· ${g.caseStudySlug} already has a "${g.serviceSlug}" gallery — skipping`);
      continue;
    }

    const mediaIds = await ensureGalleryMedia(g.dir);
    if (mediaIds.length === 0) {
      console.log(`· ${g.dir} has no images — skipping gallery`);
      continue;
    }

    const nextSort =
      existingGalleries.reduce((m, x) => Math.max(m, x.sortOrder), -1) + 1;
    const [gallery] = await db
      .insert(schema.caseStudyGalleries)
      .values({
        caseStudyId: cs.id,
        label: g.label,
        serviceSlug: g.serviceSlug,
        sortOrder: nextSort,
      })
      .returning({ id: schema.caseStudyGalleries.id });
    await db
      .insert(schema.caseStudyGalleryImages)
      .values(mediaIds.map((mediaId, i) => ({ galleryId: gallery.id, mediaId, sortOrder: i })))
      .onConflictDoNothing();
    console.log(`✓ ${g.caseStudySlug}: "${g.label}" gallery (${mediaIds.length} images)`);
  }
}

async function main() {
  console.log('Applying interior-design / giveaways content migration…');
  // Register cover media first so new case studies can reference them.
  for (const cs of NEW_CASE_STUDIES) {
    const rel = cs.coverUrl.replace('/assets/', '');
    const dir = path.dirname(rel);
    const file = path.basename(rel);
    const [clientName, svcName] = dir.split('/');
    const clientFolder = await ensureFolder(clientName, null);
    const svcFolder = await ensureFolder(svcName, clientFolder);
    await ensureMedia(dir, file, svcFolder);
  }
  await createNewCaseStudies();
  await mergeServiceTags();
  await createGalleries();
  console.log('Done.');
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
