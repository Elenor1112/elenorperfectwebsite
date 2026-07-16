'use client';

import { useEffect, useRef } from 'react';

// Lightweight scroll-reveal via IntersectionObserver (no GSAP needed for simple
// fade-ups; cheap and works with reduced-motion since CSS handles the disable).
export function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${delay}ms`;
          el.classList.add('reveal-in');
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref}
      className={`reveal ${className}`}
      style={{
        opacity: 0,
        transform: 'translateY(28px)',
        transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {children}
    </Comp>
  );
}
