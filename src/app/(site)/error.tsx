'use client';

import { useEffect } from 'react';

// Root segment error boundary. Recovers from render-time errors (including the
// extension-induced DOM mutation crash) by offering a reset instead of leaving
// the user on a dead screen.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Recovered from render error:', error);
  }, [error]);

  return (
    <section className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-display text-5xl font-bold text-gradient">Hiccup.</p>
        <p className="mx-auto mt-4 max-w-md text-white/60">
          Something interrupted the page. This is usually a browser extension
          touching the page — try again.
        </p>
        <button onClick={reset} className="btn-primary mt-8">
          Reload the experience
        </button>
      </div>
    </section>
  );
}
