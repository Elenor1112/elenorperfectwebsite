'use client';

import Link from 'next/link';
import { ImageAutoSlider } from '@/components/ui/image-auto-slider';
import { showcaseImages } from '@/components/ui/image-auto-slider.demo';
import { BrandOrbit } from '@/components/BrandOrbit';
import { ShinyText } from '@/components/ShinyText';
import type { SectionData } from '@/lib/validation/sections';

export function Hero({ data }: { data: SectionData<'hero'> }) {
  const { animation } = data;
  return (
    <section className="relative min-h-[170vh]">
      {/* Background (black base + baby-blue glow + scrim) is site-wide —
          see SiteBackground in the (site) layout. */}

      {/* Real, indexable DOM content sits on top of the background */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="container-x">
          <p className="eyebrow animate-fade-up">
            <span className="inline-block h-2 w-2 rounded-[2px] bg-brand-cyan shadow-[0_0_10px] shadow-brand-cyan" />
            {data.eyebrow}
          </p>

          <h1 className="mt-6 max-w-4xl text-balance font-display text-5xl font-bold leading-[0.98] tracking-tight md:text-7xl lg:text-8xl">
            <ShinyText
              text={data.headlineLine1}
              speed={3}
              color="#68cad6"
              shineColor="#ffffff"
              spread={120}
            />
            <br />
            <ShinyText
              text={data.headlineLine2}
              speed={3}
              delay={0.4}
              color="#68cad6"
              shineColor="#ffffff"
              spread={120}
            />
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/70">{data.sub}</p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href={data.primaryCta.href} className="btn-primary pointer-events-auto">
              {data.primaryCta.label}
              <span aria-hidden>→</span>
            </Link>
            <Link href={data.secondaryCta.href} className="btn-ghost pointer-events-auto">
              {data.secondaryCta.label}
            </Link>
          </div>

          <p className="mt-16 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/40">
            <span className="inline-block h-8 w-px animate-pulse-glow bg-white/30" />
            {data.scrollHint}
          </p>
        </div>
      </div>

      {/* Showcase strip — an auto-scrolling band of work photos bridging the
          two hero statements. */}
      {animation.showcaseStripEnabled ? (
        <div className="relative z-10">
          <ImageAutoSlider images={showcaseImages} />
        </div>
      ) : null}

      {/* Second hero panel — Elenor mark orbited by client brands. */}
      {animation.orbitEnabled ? (
        <div className="relative z-10 flex min-h-[80vh] items-center justify-center">
          <BrandOrbit />
        </div>
      ) : null}
    </section>
  );
}
