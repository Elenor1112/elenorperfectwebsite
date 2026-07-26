import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { FaqList } from '@/components/FaqList';
import { JsonLd } from '@/components/JsonLd';
import { faqSchema } from '@/lib/schema';
import { getFaqCategories } from '@/lib/data/faqs';
import { getServices } from '@/lib/data/services';
import { hubPageMetadata } from '@/lib/data/seo';
import { CTA } from '@/components/sections/CTA';

export function generateMetadata(): Promise<Metadata> {
  return hubPageMetadata('faq', {
    title: 'Frequently Asked Questions',
    description:
      'Answers to common questions about Elenor Marketing Agency’s services, pricing approach, process, and location in Cairo, Egypt.',
    canonical: '/faq',
  });
}

export default async function FaqPage() {
  const [categories, services] = await Promise.all([getFaqCategories(), getServices()]);

  // The FAQ hub shows CMS-managed categories (except the about-page-specific
  // one) plus every service's FAQ. Aggregating everything into one FAQPage
  // schema is intentional duplication — good for AEO.
  const hubCategories = categories.filter((c) => c.slug !== 'about' && c.faqs.length > 0);
  const all = [
    ...hubCategories.flatMap((c) => c.faqs),
    ...services.flatMap((s) => s.faq),
  ];

  return (
    <>
      {all.length > 0 ? <JsonLd data={faqSchema(all)} /> : null}
      <PageShell
        eyebrow="FAQ"
        title="Frequently asked questions."
        lede="Answers to the questions we hear most about Elenor Marketing Agency’s services, process, pricing approach, and location in Cairo, Egypt. Each question also appears on its relevant service page."
        crumbs={[{ name: 'FAQ', path: '/faq' }]}
      />

      <section className="py-20">
        <div className="container-x max-w-6xl">
          {/* Category blocks in a 2-column grid — laid out row by row (1 2 /
              3 4 …) so each pair's headline aligns across the row. `items-start`
              lets a taller block grow without stretching its shorter neighbour. */}
          <div className="grid grid-cols-1 items-start gap-x-8 gap-y-12 md:grid-cols-2">
            {[
              ...hubCategories.map((c) => ({ key: c.slug, name: c.name, faqs: c.faqs })),
              ...services
                .filter((s) => s.faq.length > 0)
                .map((s) => ({ key: s.slug, name: s.name, faqs: s.faq })),
            ].map((block) => (
              <div key={block.key}>
                <h2 className="font-display text-2xl font-semibold">{block.name}</h2>
                <div className="mt-6">
                  <FaqList items={block.faqs} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTA />
    </>
  );
}
