import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { FaqList } from '@/components/FaqList';
import { Reveal } from '@/components/Reveal';
import { CTA } from '@/components/sections/CTA';
import { JsonLd } from '@/components/JsonLd';
import { faqSchema } from '@/lib/schema';
import { getPage, getSection } from '@/lib/data/pages';
import { getFaqsByCategory } from '@/lib/data/faqs';
import { hubPageMetadata } from '@/lib/data/seo';

export function generateMetadata(): Promise<Metadata> {
  return hubPageMetadata('about', {
    title: 'About — Cairo-Based Branding & Marketing Team',
    description:
      'Meet the team behind Elenor Marketing Agency, led by CEO Emad Samir — a Cairo-based agency building tailored marketing strategies for startups and enterprise clients since 2021.',
    canonical: '/about',
  });
}

export default async function AboutPage() {
  const [page, aboutFaq] = await Promise.all([getPage('about'), getFaqsByCategory('about')]);

  const hero = getSection(page, 'about_hero');
  const quote = getSection(page, 'ceo_quote');
  const story = getSection(page, 'story');
  const values = getSection(page, 'values');
  const missionVision = getSection(page, 'mission_vision');
  const timeline = getSection(page, 'timeline');
  const team = getSection(page, 'team');
  const faqHeading = getSection(page, 'about_faq');

  const enabled = (type: string) =>
    page?.sections.some((s) => s.type === type && s.isEnabled) ?? false;

  return (
    <>
      {aboutFaq.length > 0 ? <JsonLd data={faqSchema(aboutFaq)} /> : null}
      <PageShell
        eyebrow={hero.data.eyebrow}
        title={hero.data.title}
        lede={hero.data.lede}
        crumbs={[{ name: 'About', path: '/about' }]}
      />

      <section className="py-24">
        <div className="container-x grid gap-16 lg:grid-cols-[1.2fr_1fr]">
          {enabled('ceo_quote') ? (
            <Reveal className="rounded-3xl glass p-9">
              <p className="eyebrow">{quote.data.eyebrow}</p>
              <blockquote className="mt-6 font-display text-xl font-medium leading-relaxed text-white/85 md:text-2xl">
                {quote.data.quote}
              </blockquote>
              <cite className="mt-6 block not-italic text-sm text-white/50">
                {quote.data.cite}
              </cite>
            </Reveal>
          ) : null}

          {enabled('story') ? (
            <Reveal delay={120}>
              <h2 className="font-display text-3xl font-semibold leading-tight">
                {story.data.heading}
              </h2>
              {story.data.paragraphs.map((p, i) => (
                <p key={i} className={`leading-relaxed text-white/65 ${i === 0 ? 'mt-6' : 'mt-4'}`}>
                  {p}
                </p>
              ))}
            </Reveal>
          ) : null}
        </div>

        {enabled('values') ? (
          <div className="container-x mt-20 grid gap-6 md:grid-cols-3">
            {values.data.items.map((v, i) => (
              <Reveal key={v.title} delay={i * 90} className="rounded-2xl glass p-7">
                <h3 className="font-display text-xl font-semibold text-brand-glow">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{v.description}</p>
              </Reveal>
            ))}
          </div>
        ) : null}
      </section>

      {enabled('mission_vision') && (missionVision.data.mission || missionVision.data.vision) ? (
        <section className="border-t border-white/10 py-24">
          <div className="container-x grid gap-6 md:grid-cols-2">
            {missionVision.data.mission ? (
              <Reveal className="rounded-3xl glass p-9">
                <p className="eyebrow">{missionVision.data.missionTitle}</p>
                <p className="mt-5 text-lg leading-relaxed text-white/70">
                  {missionVision.data.mission}
                </p>
              </Reveal>
            ) : null}
            {missionVision.data.vision ? (
              <Reveal delay={120} className="rounded-3xl glass p-9">
                <p className="eyebrow">{missionVision.data.visionTitle}</p>
                <p className="mt-5 text-lg leading-relaxed text-white/70">
                  {missionVision.data.vision}
                </p>
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      {enabled('timeline') && timeline.data.items.length > 0 ? (
        <section className="border-t border-white/10 py-24">
          <div className="container-x max-w-3xl">
            <h2 className="font-display text-3xl font-semibold">{timeline.data.heading}</h2>
            <ol className="mt-10 space-y-6 border-l border-white/10 pl-6">
              {timeline.data.items.map((item) => (
                <li key={`${item.year}-${item.title}`}>
                  <p className="font-display text-sm font-bold text-brand-glow">{item.year}</p>
                  <p className="mt-1 font-display text-lg font-semibold">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-white/60">
                      {item.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {enabled('team') && team.data.members.length > 0 ? (
        <section className="border-t border-white/10 py-24">
          <div className="container-x">
            <h2 className="font-display text-3xl font-semibold">{team.data.heading}</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {team.data.members.map((m) => (
                <div key={m.name} className="rounded-2xl glass p-7">
                  <p className="font-display text-xl font-semibold">{m.name}</p>
                  <p className="mt-1 text-sm text-brand-glow">{m.jobTitle}</p>
                  {m.bio ? (
                    <p className="mt-3 text-sm leading-relaxed text-white/60">{m.bio}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {enabled('about_faq') && aboutFaq.length > 0 ? (
        <section className="border-t border-white/10 bg-white/[0.02] py-24">
          <div className="container-x max-w-3xl">
            <p className="eyebrow">{faqHeading.data.eyebrow}</p>
            <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
              {faqHeading.data.heading}
            </h2>
            <div className="mt-10">
              <FaqList items={aboutFaq} />
            </div>
          </div>
        </section>
      ) : null}

      <CTA />
    </>
  );
}
