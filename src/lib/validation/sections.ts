import { z } from 'zod';

// One zod schema per page-section `type`. Section rows store their content in
// a jsonb `data` column; these schemas are the contract between the admin
// editor forms and the public components. Every field has a default so a
// partially-filled section never crashes a render.

const cta = (label: string, href: string) =>
  z.object({ label: z.string().default(label), href: z.string().default(href) }).prefault({});

/* ---------------------------------- home ---------------------------------- */

export const heroSchema = z.object({
  eyebrow: z.string().default('Cairo · Egypt · Since 2021'),
  headlineLine1: z.string().default('Where Innovation'),
  headlineLine2: z.string().default('Meets Quality.'),
  sub: z
    .string()
    .default(
      'Since 2021, Elenor has crafted brand identity, social, video, web & events for 50+ clients — including Coca-Cola, Saint-Gobain, Duravit, and Zoetis.',
    ),
  primaryCta: cta('Start a project', '/contact'),
  secondaryCta: cta('See our work', '/work'),
  scrollHint: z.string().default('Scroll to explore'),
  animation: z
    .object({
      introEnabled: z.boolean().default(true),
      orbitEnabled: z.boolean().default(true),
      showcaseStripEnabled: z.boolean().default(true),
    })
    .prefault({}),
});

export const philosophySchema = z.object({
  eyebrow: z.string().default('Our philosophy'),
  eyebrowHref: z.string().default('/about'),
  heading: z.string().default('We exist to build real brand presence — and measurable growth.'),
  body: z
    .string()
    .default(
      'From early-stage startups to established enterprises, our mission, vision, and values guide every project we take on. We build marketing strategies that earn customer loyalty and drive outcomes you can measure — not vanity output.',
    ),
  values: z
    .array(z.object({ title: z.string(), description: z.string() }))
    .default([
      { title: 'Credibility', description: 'We say what we’ll deliver and deliver what we say — work you can put your name on.' },
      { title: 'Flexibility', description: 'Plans built around your actual size, industry, and stage — never a templated playbook.' },
      { title: 'Fast response', description: 'A genuinely competitive market rewards speed; we move at the pace your brand needs.' },
      { title: 'Creativity', description: 'A relentless focus on outcomes, not just output — ideas that actually move the business.' },
    ]),
});

export const servicesShowcaseSchema = z.object({
  eyebrow: z.string().default('What we do'),
  heading: z.string().default('Explore our work, one discipline at a time.'),
});

export const statsSchema = z.object({
  eyebrow: z.string().default('Company Growth'),
  heading: z.string().default('Proof, not promises.'),
  items: z
    .array(z.object({ value: z.number(), suffix: z.string().default(''), label: z.string() }))
    .default([
      { value: 50, suffix: '+', label: 'Satisfied Clients' },
      { value: 100, suffix: '+', label: 'Successful Projects' },
      { value: 300, suffix: '+', label: 'Days of Active Operation' },
      { value: 10, suffix: '', label: 'Core Services' },
    ]),
  footnote: z.string().default('…and a team that runs on a genuinely excessive amount of coffee.'),
});

export const clientsSchema = z.object({
  eyebrow: z.string().default('Trusted by'),
  heading: z.string().default('Brands that don’t settle for template work.'),
});

export const blogPreviewSchema = z.object({
  eyebrow: z.string().default('From the studio'),
  heading: z.string().default('Insights, not filler.'),
  linkLabel: z.string().default('All articles →'),
  count: z.number().int().min(1).max(12).default(6),
});

export const ctaSectionSchema = z.object({
  heading: z.string().default('Ready to collaborate?'),
  body: z
    .string()
    .default(
      'Tell us about your business and what you’re trying to achieve. We’ll get back to you within one business day.',
    ),
  primaryCta: cta('Start a project →', '/contact'),
  secondaryCta: cta('Explore our work', '/work'),
});

/* ---------------------------------- about --------------------------------- */

export const aboutHeroSchema = z.object({
  eyebrow: z.string().default('Why Elenor'),
  title: z.string().default('We don’t just build brands. We build them from scratch.'),
  lede: z
    .string()
    .default(
      'Elenor Marketing Agency is led by CEO Emad Samir, a former marketing director at Meamar with a master’s in management and marketing from ESLSCA France. We build brands end-to-end — strategy, identity, content, and execution — for businesses of every size across Egypt and the region.',
    ),
});

export const ceoQuoteSchema = z.object({
  eyebrow: z.string().default('The CEO’s word'),
  quote: z
    .string()
    .default(
      '“Thinking back to the first time I did online marketing, I find it incredible how things have changed — and the pace of that change is only increasing. We built our strategy around the latest tools and techniques without losing sight of what actually moves a client’s business forward. I’m confident Elenor will keep exceeding its own bar in a genuinely competitive industry.”',
    ),
  cite: z.string().default('— Eng. Emad Samir, CEO & Founder'),
});

export const storySchema = z.object({
  heading: z.string().default('What “tailored” actually means.'),
  paragraphs: z
    .array(z.string())
    .default([
      'We are not builders, but we build from scratch. Elenor’s team develops marketing plans based on each client’s real size, industry, and stage — grounded in actual market research, not a templated playbook. That means strategy, identity, content, and media handled by one accountable team, so the brand experience stays consistent from the first concept to the final campaign.',
      'The result shows up in named work: pharmaceutical and healthcare brands like Zoetis and Marcyrl, FMCG and industrial brands like Coca-Cola and Saint-Gobain, and real-estate and hospitality clients like Emaar and Al-Walid Horse Resort.',
    ]),
});

export const valuesSchema = z.object({
  items: z
    .array(z.object({ title: z.string(), description: z.string() }))
    .default([
      { title: 'Credibility', description: 'Work you can put your name on, backed by named, verifiable client results.' },
      { title: 'Flexibility', description: 'Strategies sized to your industry and stage — researched, not templated.' },
      { title: 'Reliability', description: 'Fast response and consistent delivery in a genuinely competitive market.' },
    ]),
});

export const missionVisionSchema = z.object({
  missionTitle: z.string().default('Our mission'),
  mission: z.string().default(''),
  visionTitle: z.string().default('Our vision'),
  vision: z.string().default(''),
});

export const timelineSchema = z.object({
  heading: z.string().default('Milestones'),
  items: z
    .array(z.object({ year: z.string(), title: z.string(), description: z.string().default('') }))
    .default([]),
});

export const teamSchema = z.object({
  heading: z.string().default('The team'),
  members: z
    .array(
      z.object({
        name: z.string(),
        jobTitle: z.string().default(''),
        bio: z.string().default(''),
        photoMediaId: z.string().nullable().default(null),
      }),
    )
    .default([]),
});

export const aboutFaqSchema = z.object({
  eyebrow: z.string().default('Questions'),
  heading: z.string().default('About Elenor'),
});

/* --------------------------------- registry -------------------------------- */

export const sectionSchemas = {
  hero: heroSchema,
  philosophy: philosophySchema,
  services_showcase: servicesShowcaseSchema,
  stats: statsSchema,
  clients: clientsSchema,
  blog_preview: blogPreviewSchema,
  cta: ctaSectionSchema,
  about_hero: aboutHeroSchema,
  ceo_quote: ceoQuoteSchema,
  story: storySchema,
  values: valuesSchema,
  mission_vision: missionVisionSchema,
  timeline: timelineSchema,
  team: teamSchema,
  about_faq: aboutFaqSchema,
} as const;

export type SectionType = keyof typeof sectionSchemas;
export type SectionData<T extends SectionType> = z.infer<(typeof sectionSchemas)[T]>;

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: 'Hero',
  philosophy: 'Philosophy',
  services_showcase: 'Services showcase',
  stats: 'Statistics',
  clients: 'Clients & testimonials',
  blog_preview: 'Blog preview',
  cta: 'Call to action',
  about_hero: 'About hero',
  ceo_quote: 'CEO quote',
  story: 'Company story',
  values: 'Values',
  mission_vision: 'Mission & vision',
  timeline: 'Timeline',
  team: 'Team',
  about_faq: 'About FAQ',
};

/** Parse section data leniently: invalid/missing fields fall back to defaults. */
export function parseSectionData<T extends SectionType>(
  type: T,
  data: unknown,
): SectionData<T> {
  const schema = sectionSchemas[type];
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data as SectionData<T>;
  return schema.parse({}) as SectionData<T>;
}
