import { revalidatePath, revalidateTag } from 'next/cache';
import { reindexAfterContentChange } from '@/server/ai/indexing/cms-hook';

// Central revalidation helpers — every server action calls one of these after
// a successful mutation so edits appear on the public site immediately.
//
// These are also the hook point for the AI knowledge index: any edit that
// changes public content schedules a background reindex, so the assistant
// never answers from stale content and editors never run a manual sync.

/** Routes whose content enumerates slugs; refreshed on any create/delete/publish. */
function revalidateIndexes() {
  revalidatePath('/sitemap.xml');
  revalidatePath('/llms.txt');
}

/** Settings & menus feed the (site) layout — tags alone don't reliably refresh
 *  cached layout HTML in Next 14, so pair with a layout path revalidation. */
function revalidateLayout() {
  revalidatePath('/', 'layout');
}

export function revalidateServices(slug?: string) {
  revalidateTag('services');
  if (slug) revalidateTag(`service:${slug}`);
  revalidateIndexes();
  // Footer lists services.
  revalidateLayout();
  reindexAfterContentChange('service');
}

export function revalidateCaseStudies(slug?: string) {
  revalidateTag('case-studies');
  if (slug) revalidateTag(`case-study:${slug}`);
  revalidateIndexes();
  reindexAfterContentChange('case-study');
}

export function revalidateRoster() {
  revalidateTag('roster');
}

export function revalidatePosts(slug?: string) {
  revalidateTag('posts');
  if (slug) revalidateTag(`post:${slug}`);
  revalidateIndexes();
  reindexAfterContentChange('post');
}

export function revalidateFaqs() {
  revalidateTag('faqs');
  reindexAfterContentChange('faq');
}

export function revalidateTestimonials() {
  revalidateTag('testimonials');
  reindexAfterContentChange('testimonial');
}

export function revalidateMenus() {
  revalidateTag('menus');
  revalidateLayout();
}

export function revalidatePages(slug?: string) {
  revalidateTag('pages');
  if (slug) revalidateTag(`page:${slug}`);
  reindexAfterContentChange('page');
}

export function revalidateSettings(key: string) {
  revalidateTag(`setting:${key}`);
  revalidateLayout();
  if (key === 'site') revalidateIndexes();
  // Company facts (contact details, hours, address) are an indexed document.
  if (key === 'site' || key === 'contact') reindexAfterContentChange('settings');
}

export function revalidateMedia() {
  revalidateTag('media');
}

/** Nuclear option for cross-cutting edits (used sparingly). */
export function revalidateEverything() {
  for (const tag of [
    'services',
    'case-studies',
    'roster',
    'posts',
    'faqs',
    'testimonials',
    'menus',
    'pages',
    'media',
    'setting:site',
    'setting:theme',
    'setting:analytics',
    'setting:contact',
    'setting:work',
  ]) {
    revalidateTag(tag);
  }
  revalidateLayout();
  revalidateIndexes();
  // No source filter — rebuild the whole index.
  reindexAfterContentChange();
}
