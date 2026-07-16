import type { MetadataRoute } from 'next';
import { getSiteSettings } from '@/lib/data/settings';

// Explicitly welcome AI crawlers — blocking them removes Elenor from GEO/AEO
// answers entirely. The admin dashboard is never indexable.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteSettings();
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
      { userAgent: 'GPTBot', allow: '/', disallow: ['/admin', '/api'] },
      { userAgent: 'ClaudeBot', allow: '/', disallow: ['/admin', '/api'] },
      { userAgent: 'PerplexityBot', allow: '/', disallow: ['/admin', '/api'] },
      { userAgent: 'Google-Extended', allow: '/', disallow: ['/admin', '/api'] },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
