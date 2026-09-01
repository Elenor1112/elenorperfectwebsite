'use client';

// Interactive 3D model viewer — GLB/GLTF/FBX/OBJ, used by case-study galleries.
//
// Client-only by construction: always import it through next/dynamic with
// `ssr: false` so three.js stays out of the bundle on pages with no models.
// See ModelMedia.tsx, which is the wrapper the gallery actually renders.

import dynamic from 'next/dynamic';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { Stage } from './modelScene';
import type { ModelInfo } from './ModelFullscreenViewer';

// Loaded on demand: the fullscreen chunk isn't fetched until someone opens it.
const ModelFullscreenViewer = dynamic(() => import('./ModelFullscreenViewer'), {
  ssr: false,
  loading: () => null,
});

export type EnvironmentPreset = 'forest' | 'studio' | 'city' | 'sunset' | 'warehouse';

export type { ModelInfo };

export interface ModelViewerProps {
  url: string;
  width?: number | string;
  height?: number | string;
  modelXOffset?: number;
  modelYOffset?: number;
  enableMouseParallax?: boolean;
  enableHoverRotation?: boolean;
  environmentPreset?: EnvironmentPreset;
  fadeIn?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  showScreenshotButton?: boolean;
  /** Accessible name for the canvas region. */
  ariaLabel?: string;
  /** Native tooltip / advisory title. */
  title?: string;
  className?: string;
  /** Called once the model has loaded and been framed. */
  onLoaded?: () => void;
  /**
   * Opt in to the immersive fullscreen viewer: clicking or tapping the model
   * (or pressing Enter/Space on the focused viewer) expands it into an overlay
   * with orbit/pan/zoom, environment, lighting and camera controls.
   */
  enableFullscreen?: boolean;
  /** Metadata for the fullscreen info panel. Missing fields are hidden. */
  info?: ModelInfo;
}

/** Spinner shown inside the canvas area while the model streams in. */
function ViewerFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-brand-cyan"
        role="status"
        aria-label="Loading 3D model"
      />
    </div>
  );
}

export default function ModelViewer({
  url,
  width = '100%',
  height = 500,
  modelXOffset = 0,
  modelYOffset = 0,
  enableMouseParallax = true,
  enableHoverRotation = true,
  environmentPreset = 'forest',
  fadeIn = false,
  autoRotate = false,
  autoRotateSpeed = 0.35,
  showScreenshotButton = false,
  ariaLabel,
  title,
  className,
  onLoaded,
  enableFullscreen = false,
  info,
}: ModelViewerProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleLoaded = useMemo(
    () => () => {
      setReady(true);
      onLoaded?.();
    },
    [onLoaded],
  );

  const screenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'model.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const style: CSSProperties = { width, height, position: 'relative' };

  // Distinguish "clicked the model" from "dragged the model to orbit it": the
  // inline viewer's own OrbitControls handles drags, so only a press that
  // barely moves should open fullscreen.
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const DRAG_SLOP_PX = 6;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enableFullscreen) return;
    pressRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!enableFullscreen) return;
    const start = pressRef.current;
    pressRef.current = null;
    if (!start || !ready) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (moved <= DRAG_SLOP_PX) setFullscreen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!enableFullscreen || !ready) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFullscreen(true);
    }
  };

  // Returning focus to the container (rather than the canvas) keeps the
  // "expand" affordance the user activated as the thing that regains focus.
  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
    containerRef.current?.focus();
  }, []);

  if (failed) {
    return (
      <div
        style={style}
        className={`grid place-items-center rounded-lg bg-white/[0.04] text-sm text-white/40 ${className ?? ''}`}
      >
        <p>{ariaLabel ?? '3D model'} could not be loaded.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={style}
      className={`group overflow-hidden rounded-lg bg-white/[0.04] ${
        enableFullscreen ? 'cursor-zoom-in' : ''
      } ${className ?? ''}`}
      title={title}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      // Only a fullscreen-enabled viewer is an interactive control. Without the
      // flag this stays a plain container and the canvas keeps its own focus.
      {...(enableFullscreen
        ? {
            role: 'button' as const,
            tabIndex: 0,
            'aria-haspopup': 'dialog' as const,
            'aria-label': `${ariaLabel ?? '3D model'} — open fullscreen viewer`,
          }
        : {})}
    >
      <Canvas
        // Three-quarter view rather than dead-on: a flat or panel-like model
        // seen straight down its own axis renders as an unreadable sliver.
        camera={{ position: [3.2, 1.4, 4.2], fov: 45 }}
        dpr={[1, 2]}
        // Preserve the buffer only when a screenshot can actually be taken;
        // it costs memory on every frame otherwise.
        gl={{ preserveDrawingBuffer: showScreenshotButton, antialias: true }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement;
          // <Canvas> does not forward DOM attributes to the underlying canvas,
          // so the accessible name and keyboard focus are set here instead.
          // role="img" + aria-label makes the model a single labelled object;
          // tabindex keeps it reachable so OrbitControls can be driven by keys.
          gl.domElement.setAttribute('role', 'img');
          gl.domElement.setAttribute('aria-label', ariaLabel ?? '3D model');
          gl.domElement.setAttribute('tabindex', '0');
          if (title) gl.domElement.setAttribute('title', title);
        }}
        // Render only when something changes — idle models cost no GPU time.
        frameloop={autoRotate && !reducedMotion ? 'always' : 'demand'}
        style={{
          opacity: fadeIn && !ready ? 0 : 1,
          transition: fadeIn ? 'opacity 400ms ease' : undefined,
          outline: 'none',
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <Stage
            url={url}
            modelXOffset={modelXOffset}
            modelYOffset={modelYOffset}
            enableMouseParallax={enableMouseParallax}
            enableHoverRotation={enableHoverRotation}
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            reducedMotion={reducedMotion}
            onLoaded={handleLoaded}
          />
          <Environment preset={environmentPreset} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom
          // Keep the model upright; full vertical orbit reads as broken.
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI - Math.PI / 6}
          makeDefault
        />
      </Canvas>

      {!ready ? <ViewerFallback /> : null}

      {showScreenshotButton ? (
        <button
          type="button"
          onClick={screenshot}
          className="absolute bottom-3 right-3 rounded-md bg-black/60 px-3 py-1.5 text-xs text-white/80 transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
        >
          Screenshot
        </button>
      ) : null}

      {/* Affordance: the model is clickable, which is not otherwise discoverable.
          Fades in on hover/focus so it never competes with the model itself. */}
      {enableFullscreen && ready ? (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-white/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
          Expand
        </div>
      ) : null}

      {fullscreen ? (
        <ModelFullscreenViewer
          url={url}
          environmentPreset={environmentPreset}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          modelXOffset={modelXOffset}
          modelYOffset={modelYOffset}
          ariaLabel={ariaLabel ?? '3D model'}
          info={info}
          reducedMotion={reducedMotion}
          onClose={closeFullscreen}
        />
      ) : null}
    </div>
  );
}
