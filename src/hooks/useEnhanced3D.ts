'use client';

import { useEffect, useState } from 'react';

// Returns true only when we should render the full WebGL layer:
// WebGL is supported AND the user has not requested reduced motion.
// Anything else falls back to the static/CSS layer (progressive enhancement).
export function useEnhanced3D() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let ok = false;
    try {
      const canvas = document.createElement('canvas');
      ok = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch {
      ok = false;
    }
    setEnabled(ok);
  }, []);

  return enabled;
}
