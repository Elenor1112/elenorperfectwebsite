import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { ServicesAnimation } from '@/components/ServicesAnimation';
import { Reveal } from '@/components/Reveal';
import { CTA } from '@/components/sections/CTA';
import { SERVICE_ICONS } from '@/lib/serviceIcons';
import { getServices } from '@/lib/data/services';
import { hubPageMetadata } from '@/lib/data/seo';
import { breadcrumbSchema } from '@/lib/schema';
import { getSiteSettings } from '@/lib/data/settings';

export function generateMetadata(): Promise<Metadata> {
  return hubPageMetadata('services', {
    title: 'Services — Branding, Social, Video, Web & More',
    description:
      'Explore Elenor Marketing Agency’s nine services: brand identity, social media, web & app development, video, AI & motion graphics, events, printing, giveaways, and interior design.',
    canonical: '/services',
  });
}

/**
 * The accent no longer tints a dot — it tints the glow behind the service's
 * icon, so each card keeps the colour it had while the mark itself becomes the
 * same artwork that service wears in the hero ring.
 */
const accentGlow: Record<string, string> = {
  brand: 'bg-brand/20',
  cyan: 'bg-brand-cyan/20',
  amber: 'bg-brand-amber/20',
};

/** Square the icon is laid out in, px. Roughly the old dot's optical weight
 *  once the glow around it is counted, so the card's rhythm is unchanged. */
const ICON_BOX = 44;

/**
 * Optical size correction, per slug. Matching bounding boxes is not the same as
 * matching visual weight: most of these icons are thin outlines, but the play
 * triangle is a solid filled shape and the AI cluster is three solid discs, so
 * at an equal box they read as much heavier than their neighbours. These trims
 * are judged against the outline icons, which are the majority and set the
 * baseline. Anything not listed sits at 1.
 *
 * The hero ring does not need this — there each icon is alone in open space
 * rather than lined up against eight others in a grid, so a weight difference
 * has nothing to be compared against.
 */
const OPTICAL: Record<string, number> = {
  'video-production': 0.72,
  'ai-motion-graphics': 0.86,
  giveaways: 0.92,
};

export default async function ServicesPage() {
  const [services, site] = await Promise.all([getServices(), getSiteSettings()]);
  return (
    <>
      {/* PageShell used to emit this; the animated hero replaces the shell, so
          the breadcrumb schema has to be carried over explicitly. */}
      <JsonLd
        data={breadcrumbSchema(
          [
            { name: 'Home', path: '/' },
            { name: 'Services', path: '/services' },
          ],
          site.url,
        )}
      />
      <ServicesAnimation />

      <section className="py-20">
        <div className="container-x grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => {
            const icon = SERVICE_ICONS[s.slug];
            const box = ICON_BOX * (OPTICAL[s.slug] ?? 1);
            return (
            <Reveal key={s.slug} delay={(i % 3) * 80}>
              <Link
                href={`/services/${s.slug}`}
                className="group flex h-full flex-col rounded-2xl glass p-7 transition-all duration-500 hover:-translate-y-1 hover:border-white/25"
              >
                {/* A service added in the admin may not have artwork yet, so
                    the original accent dot stays as the fallback rather than
                    leaving the card with no mark at all. */}
                {icon ? (
                  // The wrapper is fixed at ICON_BOX regardless of the optical
                  // trim, so the trim changes the artwork's size without moving
                  // the heading below it — every card keeps the same rhythm.
                  <span
                    className="relative flex shrink-0 items-center justify-center"
                    style={{ width: ICON_BOX, height: ICON_BOX }}
                    aria-hidden
                  >
                    {/* The accent, carried over from the dot: a soft bloom
                        behind the artwork instead of a glow on it, since the
                        PNGs bring their own colour and tinting them would
                        fight it.

                        It sits on a dark disc, and that disc is load-bearing
                        rather than decorative: five of the nine icons carry
                        opaque WHITE ink (icon-02 is 77% white by pixel count —
                        the fingerprint's two lower circles), because the set
                        was drawn for the near-black hero. On the lighter glass
                        card that white read as bright blobs floating next to
                        the mark. Putting the artwork back on a dark ground is
                        what the hero gives it for free. */}
                    <span
                      className="absolute -inset-2 rounded-full"
                      style={{
                        background:
                          'radial-gradient(circle, rgb(5 6 10 / 0.8) 35%, rgb(5 6 10 / 0) 70%)',
                      }}
                    />
                    <span
                      className={`absolute inset-0 rounded-full blur-lg transition-opacity duration-500 group-hover:opacity-90 ${accentGlow[s.accent]} opacity-60`}
                    />
                    {/* Each file is a 713x673 canvas with the art floating in
                        transparent padding, so the rendered canvas is grown by
                        1/fill to bring the ARTWORK itself up to ICON_BOX. That
                        makes the image box overflow this span — up to 5x for
                        the play triangle, which carries the most padding — so
                        the wrapper clips it. Without the clip the top row's
                        icons spilled out of the card and over the header.

                        Sized against the axis the canvas is square to: these
                        canvases are near-square, so fitting the long edge of
                        the ART means driving whichever side its aspect makes
                        longest. */}
                    {/* Grow the canvas so the ARTWORK lands at `box` on its
                        longer axis. Sizing by width and taking the larger of
                        the two grown widths makes the art fit inside `box` on
                        BOTH axes, so nothing has to be clipped — an earlier
                        pass clipped instead and cut 20px off every side of the
                        fingerprint, whose ink is centred but wider than the
                        square box its height implied. */}
                    <Image
                      src={icon.src}
                      alt=""
                      className="relative max-w-none select-none transition-transform duration-500 group-hover:scale-110"
                      style={{
                        width: box / Math.max(icon.fillX, icon.fillY * icon.aspect),
                        height: 'auto',
                      }}
                    />
                  </span>
                ) : (
                  <span className={`h-2.5 w-2.5 rounded-[3px] ${accentGlow[s.accent]} shadow-[0_0_12px] shadow-current`} />
                )}
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
            );
          })}
        </div>
      </section>
      <CTA />
    </>
  );
}
