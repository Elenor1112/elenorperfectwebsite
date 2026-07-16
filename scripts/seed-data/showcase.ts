// Metadata for the services showcase section (Kijamii-style filterable grid).
// The left-hand list is a curated subset of `services` that have real case
// studies in `work.ts`; each carries a tagline and a unique gradient used for
// the active/hover state and the card category pills.

export type ShowcaseService = {
  name: string; // must match a CaseStudy.categories value exactly
  slug: string; // links to /services/[slug]
  tagline: string; // fades in under the name when active
  // Tailwind gradient stops for the active name + pill accent.
  gradient: string; // e.g. 'from-brand to-brand-glow'
  pill: string; // pill text/border colour classes
};

export const showcaseServices: ShowcaseService[] = [
  {
    name: 'Brand Identity',
    slug: 'brand-identity',
    tagline: 'Marks, systems, and guidelines that hold a brand together.',
    gradient: 'from-[#68cad6] to-[#8bdae3]',
    pill: 'border-brand-glow/50 text-brand-glow',
  },
  {
    name: 'Social Media',
    slug: 'social-media',
    tagline: 'Strategy, content, and paid campaigns across every platform.',
    gradient: 'from-[#36e0d0] to-[#80ffdb]',
    pill: 'border-brand-cyan/50 text-brand-cyan',
  },
  {
    name: 'Web & App Development',
    slug: 'web-app-development',
    tagline: 'Fast, mobile-first sites and apps built to load and last.',
    gradient: 'from-[#1aebe4] to-[#68cad6]',
    pill: 'border-[#1aebe4]/50 text-[#1aebe4]',
  },
  {
    name: 'Video Production',
    slug: 'video-production',
    tagline: 'Concept-to-edit film for products, factories, and brands.',
    gradient: 'from-[#ffb547] to-[#ff7ea8]',
    pill: 'border-brand-amber/50 text-brand-amber',
  },
  {
    name: 'AI & Motion Graphics',
    slug: 'ai-motion-graphics',
    tagline: 'AI-powered visuals, animated ads, and motion branding that move.',
    gradient: 'from-[#80ffdb] to-[#8bdae3]',
    pill: 'border-[#80ffdb]/50 text-[#80ffdb]',
  },
  {
    name: 'Event Planning',
    slug: 'event-planning',
    tagline: 'Logistics, staffing, and on-site capture, start to wrap.',
    gradient: 'from-[#ff7ea8] to-[#ffb547]',
    pill: 'border-[#ff7ea8]/50 text-[#ff7ea8]',
  },
  {
    name: 'Printing & Production',
    slug: 'printing-production',
    tagline: 'Billboards, booths, and print — design through installation.',
    gradient: 'from-[#8bdae3] to-[#ffb547]',
    pill: 'border-[#8bdae3]/50 text-[#8bdae3]',
  },
  {
    name: 'Giveaways',
    slug: 'giveaways',
    tagline: 'Custom branded giveaways built as an extension of the brand.',
    gradient: 'from-[#ffb547] to-[#80ffdb]',
    pill: 'border-[#ffb547]/50 text-[#ffb547]',
  },
  {
    name: 'Interior Design',
    slug: 'interior-design',
    tagline: 'Brand-aligned retail, office, and hospitality spaces.',
    gradient: 'from-[#8bdae3] to-[#36e0d0]',
    pill: 'border-brand/50 text-brand-glow',
  },
];
