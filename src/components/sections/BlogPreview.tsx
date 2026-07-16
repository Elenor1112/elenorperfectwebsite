import Link from 'next/link';
import { Reveal } from '@/components/Reveal';
import type { PublicPost } from '@/lib/data/posts';
import type { SectionData } from '@/lib/validation/sections';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Standard 2D card grid — not every section needs WebGL.
export function BlogPreview({
  data,
  posts,
}: {
  data: SectionData<'blog_preview'>;
  posts: PublicPost[];
}) {
  return (
    <section className="relative z-10 border-t border-white/10 bg-white/[0.02] py-28">
      <div className="container-x">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">{data.eyebrow}</p>
            <h2 className="mt-4 font-display text-3xl font-semibold md:text-5xl">
              {data.heading}
            </h2>
          </div>
          <Link href="/blog" className="btn-ghost">
            {data.linkLabel}
          </Link>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, data.count).map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 90}>
              <Link
                href={`/blog/${p.slug}`}
                className="group flex h-full flex-col rounded-2xl glass p-7 transition-all duration-500 hover:-translate-y-1 hover:border-white/25"
              >
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand-cyan">
                  {p.category}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold leading-snug transition-colors group-hover:text-brand-glow">
                  {p.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">{p.dek}</p>
                <div className="mt-6 flex items-center justify-between text-xs text-white/40">
                  <span>{p.author.name}</span>
                  <span>
                    {fmtDate(p.date)} · {p.readMinutes} min
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
