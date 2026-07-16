import Link from 'next/link';
import { Reveal } from '@/components/Reveal';
import type { SectionData } from '@/lib/validation/sections';

// Server component — pure content, fully indexable, carries the AEO-friendly copy.
export function Philosophy({ data }: { data: SectionData<'philosophy'> }) {
  return (
    <section className="relative z-10 py-28">
      <div className="container-x grid gap-16 lg:grid-cols-2">
        <div>
          <Reveal>
            <Link href={data.eyebrowHref} className="eyebrow transition-colors hover:text-white">
              {data.eyebrow}
              <span aria-hidden>→</span>
            </Link>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-tight md:text-5xl">
              {data.heading}
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-white/65">{data.body}</p>
          </Reveal>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {data.values.map((v, i) => (
            <Reveal
              key={v.title}
              delay={i * 90}
              className="rounded-2xl glass p-6 transition-colors duration-500 hover:bg-white/[0.05]"
            >
              <h3 className="font-display text-xl font-semibold" style={{ color: '#68cad6' }}>
                {v.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{v.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
