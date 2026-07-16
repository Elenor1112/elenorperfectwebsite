import { revalidatePath, revalidateTag } from 'next/cache';

// Central revalidation helpers — every server action calls one of these after
// a successful mutation so edits appear on the public site immediately.

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
}

export function revalidateCaseStudies(slug?: string) {
  revalidateTag('case-studies');
  if (slug) revalidateTag(`case-study:${slug}`);
  revalidateIndexes();
}

export function revalidateRoster() {
  revalidateTag('roster');
}

export function revalidatePosts(slug?: string) {
  revalidateTag('posts');
  if (slug) revalidateTag(`post:${slug}`);
  revalidateIndexes();
}

export function revalidateFaqs() {
  revalidateTag('faqs');
}

export function revalidateTestimonials() {
  revalidateTag('testimonials');
}

export function revalidateMenus() {
  revalidateTag('menus');
  revalidateLayout();
}

export function revalidatePages(slug?: string) {
  revalidateTag('pages');
  if (slug) revalidateTag(`page:${slug}`);
}

export function revalidateSettings(key: string) {
  revalidateTag(`setting:${key}`);
  revalidateLayout();
  if (key === 'site') revalidateIndexes();
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
}
