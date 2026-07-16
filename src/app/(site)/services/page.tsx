import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { Reveal } from '@/components/Reveal';
import { CTA } from '@/components/sections/CTA';
import { getServices } from '@/lib/data/services';
import { hubPageMetadata } from '@/lib/data/seo';

export function generateMetadata(): Promise<Metadata> {
  return hubPageMetadata('services', {
    title: 'Services — Branding, Social, Video, Web & More',
    description:
      'Explore Elenor Marketing Agency’s nine services: brand identity, social media, web & app development, video, AI & motion graphics, events, printing, giveaways, and interior design.',
    canonical: '/services',
  });
}

const accentDot: Record<string, string> = {
  brand: 'bg-brand',
  cyan: 'bg-brand-cyan',
  amber: 'bg-brand-amber',
};

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <>
      <PageShell
        eyebrow="What we do"
        title="Nine services, delivered by one accountable team."
        lede="Elenor Marketing Agency offers nine core services in-house — brand identity, social media, web and app development, video, AI & motion graphics, events, printing, giveaways, and interior design — so your brand stays consistent from strategy to execution."
        crumbs={[{ name: 'Services', path: '/services' }]}
      />

      <section className="py-20">
        <div className="container-x grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.slug} delay={(i % 3) * 80}>
              <Link
                href={`/services/${s.slug}`}
                className="group flex h-full flex-col rounded-2xl glass p-7 transition-all duration-500 hover:-translate-y-1 hover:border-white/25"
              >
                <span className={`h-2.5 w-2.5 rounded-[3px] ${accentDot[s.accent]} shadow-[0_0_12px] shadow-current`} />
                <h2 className="mt-5 font-display text-2xl font-semibold transition-colors group-hover:text-brand-glow">
                  {s.name}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">
                  {s.short}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-glow">
                  Learn more
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <CTA />
    </>
  );
}
