// Declarative field manifests for each page-section type. The editor renders
// these; the zod schemas in src/lib/validation/sections.ts stay the source of
// truth for shape/validation.

export type ItemField = {
  name: string;
  label: string;
  kind: 'text' | 'textarea' | 'number';
};

export type FieldDef =
  | { kind: 'text' | 'textarea'; name: string; label: string; hint?: string }
  | { kind: 'number'; name: string; label: string; hint?: string }
  | { kind: 'toggle'; name: string; label: string; hint?: string }
  | { kind: 'cta'; name: string; label: string }
  | { kind: 'image'; name: string; label: string; hint?: string }
  | { kind: 'stringlist'; name: string; label: string; hint?: string }
  | { kind: 'items'; name: string; label: string; fields: ItemField[]; hint?: string };

export const SECTION_FIELDS: Record<string, FieldDef[]> = {
  hero: [
    { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
    { kind: 'text', name: 'headlineLine1', label: 'Headline — line 1' },
    { kind: 'text', name: 'headlineLine2', label: 'Headline — line 2' },
    { kind: 'textarea', name: 'sub', label: 'Subheading' },
    { kind: 'cta', name: 'primaryCta', label: 'Primary button' },
    { kind: 'cta', name: 'secondaryCta', label: 'Secondary button' },
    { kind: 'text', name: 'scrollHint', label: 'Scroll hint' },
    { kind: 'toggle', name: 'animation.introEnabled', label: 'Intro animation', hint: 'first-visit tagline → logo sequence' },
    { kind: 'toggle', name: 'animation.orbitEnabled', label: 'Brand orbit', hint: 'client logos orbiting the Elenor mark' },
    { kind: 'toggle', name: 'animation.showcaseStripEnabled', label: 'Photo strip', hint: 'auto-scrolling work photos' },
  ],
  philosophy: [
    { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
    { kind: 'text', name: 'eyebrowHref', label: 'Eyebrow link' },
    { kind: 'textarea', name: 'heading', label: 'Heading' },
    { kind: 'textarea', name: 'body', label: 'Body' },
    {
      kind: 'items',
      name: 'values',
      label: 'Value cards',
      fields: [
        { name: 'title', label: 'Title', kind: 'text' },
        { name: 'description', label: 'Description', kind: 'textarea' },
      ],
    },
  ],
  services_showcase: [
    { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
    { kind: 'textarea', name: 'heading', label: 'Heading', hint: 'cards & filters come from Services and Work' },
  ],
  stats: [
    { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
    { kind: 'text', name: 'heading', label: 'Heading' },
    {
      kind: 'items',
      name: 'items',
      label: 'Statistics',
      fields: [
        { name: 'value', label: 'Number', kind: 'number' },
        { name: 'suffix', label: 'Suffix', kind: 'text' },
        { name: 'label', label: 'Label', kind: 'text' },
      ],
    },
    { kind: 'text', name: 'footnote', label: 'Footnote' },
  ],
  clients: [
    { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
    { kind: 'textarea', name: 'heading', label: 'Heading', hint: 'client names come from Settings → Site; quotes from Testimonials' },
  ],
  blog_preview: [
    { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
    { kind: 'text', name: 'heading', label: 'Heading' },
    { kind: 'text', name: 'linkLabel', label: 'Link label' },
    { kind: 'number', name: 'count', label: 'Posts to show' },
  ],
  cta: [
    { kind: 'text', name: 'heading', label: 'Heading', hint: 'this CTA closes almost every page' },
    { kind: 'textarea', name: 'body', label: 'Body' },
    { kind: 'cta', name: 'primaryCta', label: 'Primary button' },
    { kind: 'cta', name: 'secondaryCta', label: 'Secondary button' },
  ],
  about_hero: [
    { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
    { kind: 'textarea', name: 'title', label: 'Title' },
    { kind: 'textarea', name: 'lede', label: 'Lede' },
  ],
  ceo_quote: [
    { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
    { kind: 'textarea', name: 'quote', label: 'Quote' },
    { kind: 'text', name: 'cite', label: 'Attribution' },
    {
      kind: 'image',
      name: 'portrait',
      label: 'Portrait',
      hint: 'cut-out PNG with a transparent background — the figure overlaps the card edge, so a photo with its background still on will show as a rectangle',
    },
  ],
  story: [
    { kind: 'text', name: 'heading', label: 'Heading' },
    { kind: 'stringlist', name: 'paragraphs', label: 'Paragraphs' },
  ],
  values: [
    {
      kind: 'items',
      name: 'items',
      label: 'Value cards',
      fields: [
        { name: 'title', label: 'Title', kind: 'text' },
        { name: 'description', label: 'Description', kind: 'textarea' },
      ],
    },
  ],
  mission_vision: [
    { kind: 'text', name: 'missionTitle', label: 'Mission title' },
    { kind: 'textarea', name: 'mission', label: 'Mission' },
    { kind: 'text', name: 'visionTitle', label: 'Vision title' },
    { kind: 'textarea', name: 'vision', label: 'Vision' },
  ],
  brand_philosophy: [
    { kind: 'text', name: 'heading', label: 'Heading' },
    { kind: 'textarea', name: 'vision', label: 'Our Vision' },
    { kind: 'textarea', name: 'mission', label: 'Our Mission' },
    { kind: 'textarea', name: 'values', label: 'Our Values' },
    { kind: 'textarea', name: 'goals', label: 'Our Goals' },
  ],
  timeline: [
    { kind: 'text', name: 'heading', label: 'Heading' },
    {
      kind: 'items',
      name: 'items',
      label: 'Milestones',
      fields: [
        { name: 'year', label: 'Year', kind: 'text' },
        { name: 'title', label: 'Title', kind: 'text' },
        { name: 'description', label: 'Description', kind: 'textarea' },
      ],
    },
  ],
  team: [
    { kind: 'text', name: 'heading', label: 'Heading' },
    {
      kind: 'items',
      name: 'members',
      label: 'Team members',
      fields: [
        { name: 'name', label: 'Name', kind: 'text' },
        { name: 'jobTitle', label: 'Job title', kind: 'text' },
        { name: 'bio', label: 'Bio', kind: 'textarea' },
      ],
    },
  ],
  about_faq: [
    { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
    { kind: 'text', name: 'heading', label: 'Heading', hint: 'questions are managed under FAQ → About Elenor' },
  ],
};
