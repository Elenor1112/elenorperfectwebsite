'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useAnimationFrame,
  useTransform,
} from 'framer-motion';

type ShinyTextProps = {
  text: string;
  className?: string;
  disabled?: boolean;
  /** Seconds for one sweep of the shine. */
  speed?: number;
  /** Base text color the shine travels over. */
  color?: string;
  /** Peak highlight color of the shine. */
  shineColor?: string;
  /** Angle (deg) of the shine band. */
  spread?: number;
  /** Bounce the shine back and forth instead of looping. */
  yoyo?: boolean;
  pauseOnHover?: boolean;
  direction?: 'left' | 'right';
  /** Seconds to hold between sweeps. */
  delay?: number;
};

// A gradient-clipped text mask with a moving highlight band, driven per-frame
// by framer-motion so the sweep stays smooth and respects reduced-motion /
// hover pausing. The full text is real DOM (SEO/GEO/AEO-visible); the effect
// is purely visual paint over it.
export function ShinyText({
  text,
  className = '',
  disabled = false,
  speed = 2,
  color = '#bfe9f0',
  shineColor = '#ffffff',
  spread = 120,
  yoyo = false,
  pauseOnHover = false,
  direction = 'left',
  delay = 0,
}: ShinyTextProps) {
  const [isPaused, setIsPaused] = useState(false);
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const directionRef = useRef(direction === 'left' ? 1 : -1);

  const animationDuration = speed * 1000;
  const delayDuration = delay * 1000;

  useAnimationFrame((time) => {
    if (disabled || isPaused) {
      lastTimeRef.current = null;
      return;
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += deltaTime;

    const dir = directionRef.current;

    if (yoyo) {
      const cycleDuration = animationDuration + delayDuration;
      const fullCycle = cycleDuration * 2;
      const cycleTime = elapsedRef.current % fullCycle;

      if (cycleTime < animationDuration) {
        const p = (cycleTime / animationDuration) * 100;
        progress.set(dir === 1 ? p : 100 - p);
      } else if (cycleTime < cycleDuration) {
        progress.set(dir === 1 ? 100 : 0);
      } else if (cycleTime < cycleDuration + animationDuration) {
        const reverseTime = cycleTime - cycleDuration;
        const p = 100 - (reverseTime / animationDuration) * 100;
        progress.set(dir === 1 ? p : 100 - p);
      } else {
        progress.set(dir === 1 ? 0 : 100);
      }
    } else {
      const cycleDuration = animationDuration + delayDuration;
      const cycleTime = elapsedRef.current % cycleDuration;

      if (cycleTime < animationDuration) {
        const p = (cycleTime / animationDuration) * 100;
        progress.set(dir === 1 ? p : 100 - p);
      } else {
        progress.set(dir === 1 ? 100 : 0);
      }
    }
  });

  useEffect(() => {
    directionRef.current = direction === 'left' ? 1 : -1;
    elapsedRef.current = 0;
    progress.set(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  // p=0 -> shine off the right edge; p=100 -> shine off the left edge.
  const backgroundPosition = useTransform(
    progress,
    (p) => `${150 - p * 2}% center`,
  );

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true);
  }, [pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false);
  }, [pauseOnHover]);

  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{
        backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundPosition,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {text}
    </motion.span>
  );
}

export default ShinyText;
