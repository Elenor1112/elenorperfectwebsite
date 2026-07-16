import { z } from 'zod';

// Input schemas shared by admin forms (react-hook-form resolvers) and server
// actions — the single source of truth for what a valid entity looks like.

export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers, and hyphens only');

export const richTextSchema = z
  .object({ type: z.literal('doc'), content: z.array(z.unknown()).optional() })
  .nullable();

export const seoInputSchema = z.object({
  seoTitle: z.string().max(200).nullable().default(null),
  seoDescription: z.string().max(400).nullable().default(null),
  ogImageId: z.string().uuid().nullable().default(null),
  canonicalUrl: z.string().max(500).nullable().default(null),
  noIndex: z.boolean().default(false),
  seoKeywords: z.array(z.string().max(80)).max(20).default([]),
});
export type SeoInput = z.infer<typeof seoInputSchema>;

export const contentStatusSchema = z.enum(['draft', 'scheduled', 'published', 'archived']);

/* -------------------------------- services --------------------------------- */

export const faqItemSchema = z.object({
  q: z.string().min(1, 'Question required').max(500),
  a: z.string().min(1, 'Answer required').max(2000),
});

export const serviceInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: slugSchema,
  title: z.string().min(1, 'Title required').max(200),
  name: z.string().min(1, 'Name required').max(200),
  short: z.string().max(300).default(''),
  lede: z.string().max(1000).default(''),
  metaDescription: z.string().max(400).default(''),
  body: richTextSchema.default(null),
  included: z.array(z.string().min(1).max(300)).default([]),
  process: z.array(z.string().min(1).max(300)).default([]),
  proof: z.array(z.string().min(1).max(200)).default([]),
  faqs: z.array(faqItemSchema).default([]),
  accent: z.enum(['brand', 'cyan', 'amber']).default('brand'),
  icon: z.enum(['box', 'torus', 'octa', 'sphere', 'badge']).default('box'),
  featuredImageId: z.string().uuid().nullable().default(null),
  galleryMediaIds: z.array(z.string().uuid()).default([]),
  status: contentStatusSchema.default('published'),
  seo: seoInputSchema.prefault({}),
});
export type ServiceInput = z.infer<typeof serviceInputSchema>;

/* ------------------------------ case studies ------------------------------- */

export const metricSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(60),
});

export const galleryInputSchema = z.object({
  label: z.string().min(1, 'Gallery label required').max(120),
  serviceSlug: z.string().max(120).nullable().default(null),
  mediaIds: z.array(z.string().uuid()).default([]),
});

export const caseStudyInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: slugSchema,
  client: z.string().min(1, 'Client required').max(200),
  industry: z.string().max(120).default(''),
  services: z.array(z.string().min(1).max(120)).default([]),
  categories: z.array(z.string().min(1).max(120)).default([]),
  technologies: z.array(z.string().min(1).max(120)).default([]),
  result: z.string().max(600).default(''),
  description: richTextSchema.default(null),
  metrics: z.array(metricSchema).default([]),
  testimonial: z
    .object({
      quote: z.string().max(2000).default(''),
      author: z.string().max(200).default(''),
      role: z.string().max(200).default(''),
    })
    .nullable()
    .default(null),
  coverImageId: z.string().uuid().nullable().default(null),
  featured: z.boolean().default(false),
  status: contentStatusSchema.default('published'),
  galleries: z.array(galleryInputSchema).default([]),
  seo: seoInputSchema.prefault({}),
});
export type CaseStudyInput = z.infer<typeof caseStudyInputSchema>;

/* ---------------------------------- posts ---------------------------------- */

export const postInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: slugSchema,
  title: z.string().min(1, 'Title required').max(300),
  excerpt: z.string().max(600).default(''),
  body: z.object({ type: z.literal('doc'), content: z.array(z.unknown()).optional() }),
  coverImageId: z.string().uuid().nullable().default(null),
  authorName: z.string().min(1, 'Author required').max(200),
  authorTitle: z.string().max(200).default(''),
  categoryId: z.string().uuid().nullable().default(null),
  tags: z.array(z.string().min(1).max(60)).max(20).default([]),
  status: contentStatusSchema.default('draft'),
  publishedAt: z.string().datetime({ offset: true }).nullable().default(null),
  seo: seoInputSchema.prefault({}),
});
export type PostInput = z.infer<typeof postInputSchema>;

/* ----------------------------------- faqs ---------------------------------- */

export const faqInputSchema = z.object({
  id: z.string().uuid().optional(),
  question: z.string().min(1, 'Question required').max(500),
  answer: z.string().min(1, 'Answer required').max(2000),
  categoryId: z.string().uuid().nullable().default(null),
  isActive: z.boolean().default(true),
});
export type FaqInput = z.infer<typeof faqInputSchema>;

/* ------------------------------- testimonials ------------------------------ */

export const testimonialInputSchema = z.object({
  id: z.string().uuid().optional(),
  quote: z.string().min(1, 'Quote required').max(2000),
  author: z.string().min(1, 'Author required').max(200),
  role: z.string().max(200).default(''),
  company: z.string().max(200).default(''),
  avatarId: z.string().uuid().nullable().default(null),
  isActive: z.boolean().default(true),
});
export type TestimonialInput = z.infer<typeof testimonialInputSchema>;
