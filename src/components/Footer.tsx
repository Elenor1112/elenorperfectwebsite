import Link from 'next/link';
import Image from 'next/image';
import { getSiteSettings } from '@/lib/data/settings';
import { getServices } from '@/lib/data/services';
import { getMenu } from '@/lib/data/navigation';
import elenorLogo from '@/assets/elenor final logo-01.png';

export async function Footer() {
  const [site, services, companyLinks] = await Promise.all([
    getSiteSettings(),
    getServices(),
    getMenu('footer-company'),
  ]);

  const socials = [
    { label: 'LinkedIn', href: site.social.linkedin },
    { label: 'Instagram', href: site.social.instagram },
    { label: 'Facebook', href: site.social.facebook },
    { label: 'YouTube', href: site.social.youtube },
  ].filter((s) => s.href);

  return (
    <footer className="relative z-10 border-t border-white/10 pb-10 pt-20">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="Elenor — home">
              <Image src={elenorLogo} alt="Elenor" className="h-24 w-auto" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/55">
              {site.tagline}. A full-service marketing and brand agency in{' '}
              {site.address.locality}, {site.address.region}, since {site.foundingYear}.
            </p>
            <div className="mt-6 flex gap-3 text-sm text-white/60">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Services">
            {services.slice(0, 6).map((s) => (
              <FooterLink key={s.slug} href={`/services/${s.slug}`}>
                {s.name}
              </FooterLink>
            ))}
            <FooterLink href="/services">All services</FooterLink>
          </FooterCol>

          <FooterCol title="Company">
            {companyLinks.map((l) => (
              <FooterLink key={l.url} href={l.url}>
                {l.label}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Get in touch">
            <a href={`tel:${site.phone}`} className="block text-sm text-white/55 hover:text-white">
              {site.phoneDisplay}
            </a>
            <a href={`mailto:${site.email}`} className="block text-sm text-white/55 hover:text-white">
              {site.email}
            </a>
            <p className="text-sm leading-relaxed text-white/55">
              {site.address.street}
              <br />
              {site.address.locality}, {site.address.region}, {site.address.countryName}
            </p>
            <p className="text-sm text-white/40">
              {site.hours.days[0]}–{site.hours.days[site.hours.days.length - 1]},{' '}
              {site.hours.opens}–{site.hours.closes}
            </p>
          </FooterCol>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/35 md:flex-row">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>Built for speed, accessibility, and AI discoverability.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
        {title}
      </h3>
      <div className="mt-5 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-white/55 transition-colors hover:text-white">
      {children}
    </Link>
  );
}
