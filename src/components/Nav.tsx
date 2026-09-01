'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import elenorLogo from '@/assets/elenor logo For Web-03.png';

export type NavLinkItem = { href: string; label: string };

const FALLBACK_LINKS: NavLinkItem[] = [
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/work', label: 'Work' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
];
const FALLBACK_CTA: NavLinkItem = { href: '/contact', label: 'Start a project' };

export function Nav({
  links = FALLBACK_LINKS,
  cta = FALLBACK_CTA,
}: {
  links?: NavLinkItem[];
  cta?: NavLinkItem | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      id="site-nav"
      className={`fixed inset-x-0 top-0 z-[65] transition-all duration-500 ${
        scrolled ? 'py-3' : 'py-5'
      }`}
    >
      <div
        className={`container-x flex items-center justify-between rounded-full transition-all duration-500 ${
          scrolled ? 'glass !px-5 py-2.5' : 'md:px-0'
        }`}
      >
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Elenor — home">
          <Image
            src={elenorLogo}
            alt="Elenor"
            priority
            className={`w-auto transition-all duration-500 ${scrolled ? 'h-7' : 'h-9'}`}
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {cta ? (
          <div className="hidden md:block">
            <Link
              href={cta.href}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-brand-glow hover:text-white"
            >
              {cta.label}
            </Link>
          </div>
        ) : null}

        <button
          className="grid h-10 w-10 place-items-center rounded-full glass md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className="text-lg">{open ? '✕' : '☰'}</span>
        </button>
      </div>

      {open && (
        <div className="container-x mt-3 md:hidden">
          <nav className="flex flex-col gap-1 rounded-2xl glass p-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-white/80 hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
            {cta ? (
              <Link
                href={cta.href}
                onClick={() => setOpen(false)}
                className="mt-1 rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white"
              >
                {cta.label}
              </Link>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
