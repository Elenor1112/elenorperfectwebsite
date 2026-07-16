'use client';

import { Reveal } from '@/components/Reveal';
import {
  ScrollReelTestimonials,
  type Testimonial,
} from '@/components/ui/scroll-reel-testimonials';
import type { SectionData } from '@/lib/validation/sections';

// Client proof section: heading + scroll-reel testimonials. The reel columns
// carry the curated client NAMES as real text (crawlable + accessible).
export function Clients({
  data,
  testimonials,
  reelItems,
}: {
  data: SectionData<'clients'>;
  testimonials: Testimonial[];
  reelItems: string[];
}) {
  return (
    <section className="relative z-10 border-y border-white/10 bg-white/[0.02] py-24">
      <div className="container-x">
        <Reveal>
          <p className="eyebrow">{data.eyebrow}</p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold md:text-4xl">
            {data.heading}
          </h2>
        </Reveal>

        <Reveal delay={120} className="mt-14">
          <ScrollReelTestimonials testimonials={testimonials} reelItems={reelItems} />
        </Reveal>
      </div>
    </section>
  );
}
