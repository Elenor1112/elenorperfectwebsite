'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/**
 * Defers the widget so it costs the homepage nothing on first paint.
 *
 * Two layers of deferral:
 *  1. `dynamic(..., { ssr: false })` splits it into its own chunk.
 *  2. The chunk is only requested once the page is idle (or on first intent),
 *     so the widget never competes with hero/LCP work for bandwidth.
 */
const ChatWidget = dynamic(() => import('./ChatWidget'), {
  ssr: false,
  loading: () => null,
});

export function ChatWidgetLoader() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return undefined;

    let cancelled = false;
    const load = () => {
      if (!cancelled) setShouldLoad(true);
    };

    // Any sign of intent pulls the chunk in immediately.
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, load, { once: true, passive: true }));

    // Otherwise wait for idle time, with a timeout so it always arrives.
    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleHandle = idleWindow.requestIdleCallback(load, { timeout: 4000 });
    } else {
      timeoutHandle = window.setTimeout(load, 2500);
    }

    return () => {
      cancelled = true;
      events.forEach((event) => window.removeEventListener(event, load));
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
    };
  }, [shouldLoad]);

  if (!shouldLoad) return null;
  return <ChatWidget />;
}
