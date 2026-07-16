import Link from 'next/link';
import { Reveal } from '@/components/Reveal';
import { getPage, getSection } from '@/lib/data/pages';

// Shared closing block. Self-fetches its copy from the homepage 'cta' section
// (cached under page:home), so editing it once updates every page that ends
// with a CTA.
export async function CTA() {
  const home = await getPage('home').catch(() => null);
  const { data } = getSection(home, 'cta');

  return (
    <section className="relative z-10 overflow-hidden py-32">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #68cad6 0%, transparent 70%)' }}
        aria-hidden
      />
      <div className="container-x relative text-center">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-balance font-display text-4xl font-bold leading-tight md:text-6xl">
            {data.heading}
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">{data.body}</p>
        </Reveal>
        <Reveal delay={220}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href={data.primaryCta.href} className="btn-primary">
              {data.primaryCta.label}
            </Link>
            <Link href={data.secondaryCta.href} className="btn-ghost">
              {data.secondaryCta.label}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
