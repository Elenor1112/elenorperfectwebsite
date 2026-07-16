import { draftMode } from 'next/headers';

/** Fixed banner shown on the public site while draft preview is active. */
export function DraftBanner() {
  let enabled = false;
  try {
    enabled = draftMode().isEnabled;
  } catch {
    enabled = false;
  }
  if (!enabled) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-full border border-brand-amber/40 bg-[#0a0b10]/95 px-4 py-2 text-xs text-brand-amber shadow-xl backdrop-blur">
      Draft preview — unpublished content is visible
      <a href="/api/preview/disable" className="rounded-full border border-white/20 px-2.5 py-1 text-white/70 hover:text-white">
        Exit
      </a>
    </div>
  );
}
