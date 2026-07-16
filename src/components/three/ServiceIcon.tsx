'use client';

import dynamic from 'next/dynamic';
import { useEnhanced3D } from '@/hooks/useEnhanced3D';
import { CanvasBoundary } from '@/components/CanvasBoundary';

// Per-service lighter 3D touch: a single rotating low-poly mark that reacts to
// scroll. Loaded client-side only when enhancement is allowed; otherwise a
// CSS gradient orb stands in (never a blank box).
const ServiceIconCanvas = dynamic(
  () => import('./ServiceIconCanvas').then((m) => m.ServiceIconCanvas),
  { ssr: false }
);

const accentHex: Record<string, string> = {
  brand: '#68cad6',
  cyan: '#36e0d0',
  amber: '#ffb547',
};

export function ServiceIcon({
  shape,
  accent,
}: {
  shape: 'box' | 'torus' | 'octa' | 'sphere' | 'badge';
  accent: 'brand' | 'cyan' | 'amber';
}) {
  const enhanced = useEnhanced3D();
  const color = accentHex[accent];

  // CSS orb is always the base layer; the canvas mounts on top when allowed.
  // Adding the canvas as a sibling (rather than replacing the orb) avoids the
  // React removeChild crash on the false→true enhancement flip.
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-3xl glass">
      <div
        className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
        style={{ background: color, opacity: 0.5 }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-2xl"
        style={{ background: `linear-gradient(135deg, ${color}, transparent)` }}
      />
      {enhanced && (
        <div className="absolute inset-0">
          <CanvasBoundary>
            <ServiceIconCanvas shape={shape} color={color} />
          </CanvasBoundary>
        </div>
      )}
    </div>
  );
}
