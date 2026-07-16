'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Single source of truth for scroll: Lenis drives inertia, GSAP ScrollTrigger
// reads from the same RAF loop so DOM + 3D stay in lockstep. Respects
// prefers-reduced-motion by disabling smoothing (native scroll still works).
export function SmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lenis = new Lenis({
      duration: reduced ? 0 : 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !reduced,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    // Expose for other components (e.g. anchor scrolling) without prop drilling.
    (window as unknown as { lenis?: Lenis }).lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      (window as unknown as { lenis?: Lenis }).lenis = undefined;
    };
  }, []);

  return null;
}
