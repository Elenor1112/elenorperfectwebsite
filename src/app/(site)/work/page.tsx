import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { WorkGallery } from '@/components/WorkGallery';
import { CTA } from '@/components/sections/CTA';
import { getCaseStudies, getRosterClients } from '@/lib/data/work';
import { getWorkSettings } from '@/lib/data/settings';
import { hubPageMetadata } from '@/lib/data/seo';

export function generateMetadata(): Promise<Metadata> {
  return hubPageMetadata('work', {
    title: 'Our Work — Portfolio',
    description:
      'Browse Elenor Marketing Agency’s portfolio — branding, social media, video, and web projects delivered for Coca-Cola, Saint-Gobain, Duravit, Zoetis, Emaar, and more.',
    canonical: '/work',
  });
}

export default async function WorkPage() {
  const [caseStudies, roster, workSettings] = await Promise.all([
    getCaseStudies(),
    getRosterClients(),
    getWorkSettings(),
  ]);

  return (
    <>
      <PageShell
        eyebrow="Portfolio"
        title="Our Work."
        lede="A selection of campaigns, brand builds, and digital products we’ve delivered across pharma, FMCG, real estate, automotive, hospitality, and professional services — filterable by industry."
        crumbs={[{ name: 'Work', path: '/work' }]}
      />
      <section className="py-20">
        <div className="container-x">
          <WorkGallery
            caseStudies={caseStudies.map((c) => ({
              slug: c.slug,
              client: c.client,
              industry: c.industry,
              services: c.services,
              result: c.result,
            }))}
            clientRoster={roster}
            industries={workSettings.industries}
          />
        </div>
      </section>
      <CTA />
    </>
  );
}
