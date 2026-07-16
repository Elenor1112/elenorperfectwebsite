import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { Reveal } from '@/components/Reveal';
import { getPosts } from '@/lib/data/posts';
import { hubPageMetadata } from '@/lib/data/seo';

// Time fallback so scheduled posts appear within 5 minutes with no cron.
export const revalidate = 300;

export function generateMetadata(): Promise<Metadata> {
  return hubPageMetadata('blog', {
    title: 'Marketing & Branding Insights — Blog',
    description:
      'Practical marketing, branding, and digital strategy insights from the Elenor Marketing Agency team — covering social media, SEO, AEO, branding, and industry trends.',
    canonical: '/blog',
  });
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default async function BlogPage() {
  const posts = await getPosts();
  const [lead, ...rest] = posts;

  return (
    <>
      <PageShell
        eyebrow="The studio journal"
        title="Insights, not filler."
        lede="Practical marketing, branding, and digital strategy from the Elenor team — social media, SEO, AEO, branding, and the trends actually shaping how Egyptian brands grow."
        crumbs={[{ name: 'Blog', path: '/blog' }]}
      />

      <section className="py-20">
        <div className="container-x">
          {lead ? (
            <Reveal>
              <Link
                href={`/blog/${lead.slug}`}
                className="group grid gap-8 overflow-hidden rounded-3xl glass p-8 transition-all duration-500 hover:border-white/25 md:grid-cols-2 md:p-12"
              >
                <div className="flex flex-col justify-center">
                  <span className="text-xs uppercase tracking-[0.18em] text-brand-cyan">
                    {lead.category} · Featured
                  </span>
                  <h2 className="mt-4 font-display text-3xl font-semibold leading-tight transition-colors group-hover:text-brand-glow md:text-4xl">
                    {lead.title}
                  </h2>
                  <p className="mt-4 text-white/60">{lead.dek}</p>
                  <p className="mt-6 text-xs text-white/40">
                    {lead.author.name} · {fmt(lead.date)} · {lead.readMinutes} min read
                  </p>
                </div>
                {lead.coverImage ? (
                  <img
                    src={lead.coverImage.url}
                    alt={lead.coverImage.alt}
                    loading="lazy"
                    decoding="async"
                    className="hidden rounded-2xl object-cover md:block"
                  />
                ) : (
                  <div className="hidden rounded-2xl bg-gradient-to-br from-brand/30 via-ink to-brand-cyan/20 md:block" />
                )}
              </Link>
            </Reveal>
          ) : (
            <p className="text-white/50">No articles published yet — check back soon.</p>
          )}

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 80}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="group flex h-full flex-col rounded-2xl glass p-7 transition-all duration-500 hover:-translate-y-1 hover:border-white/25"
                >
                  <span className="text-xs uppercase tracking-[0.18em] text-brand-cyan">
                    {p.category}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold leading-snug transition-colors group-hover:text-brand-glow">
                    {p.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">{p.dek}</p>
                  <p className="mt-6 text-xs text-white/40">
                    {p.author.name} · {fmt(p.date)} · {p.readMinutes} min
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
