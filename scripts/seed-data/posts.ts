// Blog preview data. Real CMS (Sanity) wires in later — this drives the home blog
// rail and gives BlogPosting schema a real shape.

export type Post = {
  slug: string;
  title: string;
  dek: string;
  date: string; // ISO
  readMinutes: number;
  author: { name: string; title: string };
  category: string;
};

export const posts: Post[] = [
  {
    slug: 'marketing-vs-sales-alignment',
    title: 'Marketing vs. Sales: Where Alignment Actually Breaks',
    dek: 'Most teams blame each other for the gap. The real break is in how a lead is defined before it ever changes hands.',
    date: '2026-05-18',
    readMinutes: 6,
    author: { name: 'Emad Samir', title: 'CEO & Founder' },
    category: 'Strategy',
  },
  {
    slug: 'google-knows-the-world-chatgpt-knows-you',
    title: 'Google Knows the World, ChatGPT Knows You',
    dek: 'Search is splitting into discovery and answering. Here is how to write content that wins citations in both.',
    date: '2026-05-02',
    readMinutes: 8,
    author: { name: 'Emad Samir', title: 'CEO & Founder' },
    category: 'AEO',
  },
  {
    slug: 'brand-identity-beyond-the-logo',
    title: 'Brand Identity Is Not a Logo — It’s a System',
    dek: 'A logo is the smallest part of an identity. The system around it is what makes a brand recognizable.',
    date: '2026-04-14',
    readMinutes: 5,
    author: { name: 'Elenor Studio', title: 'Brand Team' },
    category: 'Branding',
  },
  {
    slug: 'social-media-retainer-explained',
    title: 'What a Social Media Retainer Actually Buys You',
    dek: 'Strategy, content, community, paid, and reporting — and why unbundling them usually costs more.',
    date: '2026-03-28',
    readMinutes: 6,
    author: { name: 'Elenor Studio', title: 'Social Team' },
    category: 'Social Media',
  },
  {
    slug: 'video-that-factories-actually-need',
    title: 'The Brand Video Factories Actually Need',
    dek: 'Industrial brands keep buying the wrong video. Here’s the format that drives B2B trust.',
    date: '2026-03-09',
    readMinutes: 7,
    author: { name: 'Elenor Studio', title: 'Production Team' },
    category: 'Video',
  },
  {
    slug: 'why-arabic-seo-is-an-opportunity',
    title: 'Why Arabic SEO Is the Opportunity Egyptian Brands Ignore',
    dek: 'Most local sites ship English-only. Bilingual, properly localized content is an open lane.',
    date: '2026-02-20',
    readMinutes: 6,
    author: { name: 'Emad Samir', title: 'CEO & Founder' },
    category: 'SEO',
  },
];
