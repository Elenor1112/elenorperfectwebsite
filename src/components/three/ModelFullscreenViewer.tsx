'use client';

// Immersive fullscreen 3D viewer — the "product view" mode of ModelViewer.
//
// Opened by clicking the inline viewer (see ModelViewer.tsx). This component is
// only imported through next/dynamic from there, so its weight lands in a
// separate chunk that pages never fetch until someone actually opens fullscreen.
//
// The model itself comes from ./modelScene, the same module the inline viewer
// uses, which means the loader cache is already warm: the overlay mounts with
// the model parsed and no spinner.

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Stage, type ModelStats } from './modelScene';

/**
 * Environments offered in fullscreen. Wider than the CMS's stored set (which is
 * what an editor picks as the *default*) — these are viewer-side choices the
 * visitor makes live, so extras can be offered here without a schema change.
 *
 * Every id must be a real drei HDRI preset. 'park' stands in for the neutral
 * option the design asks for: drei has no 'neutral' environment (that name
 * belongs to <Stage>'s light rigs), and park is its flat daylight HDRI.
 */
export const FULLSCREEN_ENVIRONMENTS = [
  { id: 'forest', label: 'Forest' },
  { id: 'studio', label: 'Studio' },
  { id: 'warehouse', label: 'Warehouse' },
  { id: 'city', label: 'City' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'night', label: 'Night' },
  { id: 'park', label: 'Neutral' },
] as const;

export type FullscreenEnvironment = (typeof FULLSCREEN_ENVIRONMENTS)[number]['id'];

/** Optional metadata for the info panel; absent fields are simply not shown. */
export type ModelInfo = {
  name?: string | null;
  client?: string | null;
  project?: string | null;
  fileSizeBytes?: number | null;
};

export interface ModelFullscreenViewerProps {
  url: string;
  /** Environment the inline viewer is using — the fullscreen starting point. */
  environmentPreset: FullscreenEnvironment;
  autoRotate: boolean;
  autoRotateSpeed: number;
  modelXOffset: number;
  modelYOffset: number;
  ariaLabel: string;
  info?: ModelInfo;
  reducedMotion: boolean;
  onClose: () => void;
}

type CameraPreset = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso';

// Positions on a sphere around the origin. Radius 5 frames a normalized model
// (longest axis = 2 units) with comfortable margin on every preset.
const PRESET_POSITIONS: Record<CameraPreset, [number, number, number]> = {
  front: [0, 0, 5],
  back: [0, 0, -5],
  left: [-5, 0, 0],
  right: [5, 0, 0],
  // Not exactly on the pole: a dead-vertical camera has an ambiguous up-vector
  // and OrbitControls snaps unpredictably when the user then drags.
  top: [0, 4.9, 0.6],
  bottom: [0, -4.9, 0.6],
  iso: [3.2, 2.6, 3.8],
};

const PRESET_LABELS: { id: CameraPreset; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'iso', label: 'Isometric' },
];

const DEFAULT_LIGHTING = { ambient: 0.4, key: 1.2, fill: 0.5, rim: 0.7 };

type Lighting = typeof DEFAULT_LIGHTING;

type PanelId = 'environment' | 'lighting' | 'camera' | 'animation' | 'info';

// Camera position the overlay opens on — matches the inline viewer's framing so
// the transition reads as a scale-up of what was already on screen, then eases
// out to a roomier fullscreen distance.
const OPENING_POSITION = new THREE.Vector3(3.2, 1.4, 4.2);
const SETTLED_POSITION = new THREE.Vector3(3.9, 1.7, 5.1);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

/* -------------------------------------------------------------------------- */
/* Icons — inline 24px strokes, sized by the button that holds them.          */
/* -------------------------------------------------------------------------- */

type IconProps = { className?: string };

function Icon({ children, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? 'h-[18px] w-[18px]'}
    >
      {children}
    </svg>
  );
}

const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
const IconReset = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </Icon>
);
const IconFit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Icon>
);
const IconRotate = (p: IconProps) => (
  <Icon {...p}>
    <ellipse cx="12" cy="12" rx="9" ry="4" />
    <path d="M12 3v18" />
  </Icon>
);
const IconWireframe = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
  </Icon>
);
const IconLight = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);
const IconBackground = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <path d="M3 15l5-4 4 3 3-2.5 6 4.5" />
  </Icon>
);
const IconCamera = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" />
    <circle cx="12" cy="13" r="3.2" />
  </Icon>
);
const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);
const IconChevron = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

/* -------------------------------------------------------------------------- */
/* Scene-side controllers                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Drives the camera toward a requested position over a few frames.
 *
 * A `target` of null means "nothing pending" — the user has the camera. Any
 * user drag cancels an in-flight animation via OrbitControls' 'start' event,
 * so a preset never fights the pointer.
 */
function CameraAnimator({
  target,
  reducedMotion,
  onArrive,
}: {
  target: THREE.Vector3 | null;
  reducedMotion: boolean;
  onArrive: () => void;
}) {
  const { camera, controls, invalidate } = useThree();

  // Reduced motion: jump straight there, no interpolation.
  useEffect(() => {
    if (!target || !reducedMotion) return;
    camera.position.copy(target);
    (controls as OrbitControlsImpl | null)?.update();
    invalidate();
    onArrive();
  }, [target, reducedMotion, camera, controls, invalidate, onArrive]);

  useFrame((_, delta) => {
    if (!target || reducedMotion) return;
    const dt = Math.min(delta, 0.1);
    // Exponential ease-out: fast departure, soft arrival, frame-rate independent.
    const t = 1 - Math.exp(-dt * 6);
    camera.position.lerp(target, t);
    (controls as OrbitControlsImpl | null)?.update();
    invalidate();
    // Within a pixel of the goal at fullscreen scale — stop and hand back.
    if (camera.position.distanceTo(target) < 0.01) {
      camera.position.copy(target);
      onArrive();
    }
  });

  return null;
}

/**
 * Publishes the OrbitControls instance and reports drag state upward, so the
 * backdrop click handler can tell "released after orbiting" from "clicked".
 */
function ControlsBridge({
  autoRotate,
  autoRotateSpeed,
  reducedMotion,
  onDragChange,
  onUserTakeover,
  controlsRef,
}: {
  autoRotate: boolean;
  autoRotateSpeed: number;
  reducedMotion: boolean;
  onDragChange: (dragging: boolean) => void;
  onUserTakeover: () => void;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const ref = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    controlsRef.current = controls;
    const onStart = () => {
      onDragChange(true);
      // A pointer on the model outranks any queued preset animation.
      onUserTakeover();
    };
    const onEnd = () => onDragChange(false);
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      controlsRef.current = null;
    };
  }, [controlsRef, onDragChange, onUserTakeover]);

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      // Full configurator freedom: orbit, pan and zoom, with inertia.
      enablePan
      enableZoom
      enableRotate
      enableDamping={!reducedMotion}
      dampingFactor={0.06}
      rotateSpeed={0.85}
      panSpeed={0.8}
      zoomSpeed={0.7}
      // drei maps touch gestures for us: one finger rotates, two fingers
      // pan + pinch-zoom. Stated explicitly so the intent survives refactors.
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      minDistance={1.4}
      maxDistance={14}
      autoRotate={autoRotate && !reducedMotion}
      autoRotateSpeed={autoRotateSpeed * 5}
    />
  );
}

/**
 * Keeps rendering while damping/auto-rotate is still settling. The canvas runs
 * on `demand`, so without this an inertial spin would freeze on release.
 */
function DemandDriver({ active }: { active: boolean }) {
  const { invalidate } = useThree();
  useFrame(() => {
    if (active) invalidate();
  });
  return null;
}

/* -------------------------------------------------------------------------- */
/* Panels                                                                     */
/* -------------------------------------------------------------------------- */

function Slider({
  label,
  value,
  onChange,
  max = 3,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.12em] text-white/50">
        {label}
        <span className="tabular-nums tracking-normal text-white/70">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={0}
        max={max}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-brand-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-cyan"
      />
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.06] py-2 last:border-b-0">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-white/45">{label}</dt>
      <dd className="text-right text-xs text-white/80">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function ModelFullscreenViewer({
  url,
  environmentPreset,
  autoRotate: initialAutoRotate,
  autoRotateSpeed,
  modelXOffset,
  modelYOffset,
  ariaLabel,
  info,
  reducedMotion,
  onClose,
}: ModelFullscreenViewerProps) {
  const titleId = useId();

  // Entrance/exit are driven by a state flag rather than a CSS animation so the
  // same transition can run in reverse on close, and so `closing` can gate the
  // unmount until the fade has actually finished.
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  const [environment, setEnvironment] = useState<FullscreenEnvironment>(environmentPreset);
  const [lighting, setLighting] = useState<Lighting>(DEFAULT_LIGHTING);
  const [lightsOn, setLightsOn] = useState(true);
  const [showBackground, setShowBackground] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate);
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [mobileToolbarOpen, setMobileToolbarOpen] = useState(false);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [dragging, setDragging] = useState(false);

  // Camera animation goal. Starts at the settled position so the opening frames
  // ease outward from the inline framing rather than cutting to it.
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(() =>
    SETTLED_POSITION.clone(),
  );

  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  // True from pointerdown on the canvas until pointerup, so a drag that ends
  // over the backdrop is not mistaken for a dismissing click.
  const pointerInsideRef = useRef(false);

  /** Fade out, then tell the parent to unmount us. */
  const requestClose = useCallback(() => {
    setClosing(true);
  }, []);

  // Run the entrance on the frame after mount so the browser paints the
  // from-state first; otherwise there is nothing to transition from.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Exit: hold the overlay for the fade, then unmount.
  useEffect(() => {
    if (!closing) return;
    const ms = reducedMotion ? 0 : 260;
    const timer = setTimeout(onClose, ms);
    return () => clearTimeout(timer);
  }, [closing, reducedMotion, onClose]);

  // Body scroll lock. Restores the previous inline value rather than clearing
  // it, so a page that sets its own overflow isn't trampled.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Escape closes; Tab is wrapped inside the overlay (focus trap).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const root = overlayRef.current;
      if (!root) return;
      const focusable = [
        ...root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [requestClose]);

  // Move focus into the dialog on open. The parent restores focus to the inline
  // viewer when this unmounts.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const onUserTakeover = useCallback(() => setCameraTarget(null), []);
  const onArrive = useCallback(() => setCameraTarget(null), []);

  const goToPreset = (preset: CameraPreset) => {
    setCameraTarget(new THREE.Vector3(...PRESET_POSITIONS[preset]));
  };

  const resetView = () => {
    controlsRef.current?.target.set(0, 0, 0);
    setCameraTarget(SETTLED_POSITION.clone());
  };

  /**
   * "Fit model": the model is normalized to a 2-unit longest axis, so fitting
   * is a matter of pulling the camera to the distance where that spans the
   * frame, along whatever direction the user is currently viewing from.
   */
  const fitModel = () => {
    const controls = controlsRef.current;
    const camera = controls?.object as THREE.PerspectiveCamera | undefined;
    if (!controls || !camera) {
      setCameraTarget(SETTLED_POSITION.clone());
      return;
    }
    const radius = Math.sqrt(3); // half-diagonal of a 2-unit cube
    const fov = (camera.fov * Math.PI) / 180;
    // 1.15 leaves a small breathing margin around the bounding sphere.
    const distance = (radius / Math.sin(fov / 2)) * 1.15;
    const direction = camera.position.clone().sub(controls.target);
    // A degenerate direction (camera sitting on the target) has no meaningful
    // orientation to preserve; fall back to the default three-quarter view.
    if (direction.lengthSq() < 1e-6) {
      setCameraTarget(SETTLED_POSITION.clone());
      return;
    }
    controls.target.set(0, 0, 0);
    setCameraTarget(direction.normalize().multiplyScalar(distance));
  };

  const screenshot = () => {
    const canvas = canvasElRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const base = (info?.name || ariaLabel || 'model')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    link.download = `${base || 'model'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Backdrop dismissal, minus the false positives: a click that began as a
  // drag on the model, or one that merely bubbled up from a control.
  const onBackdropPointerUp = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    if (dragging || pointerInsideRef.current) return;
    requestClose();
  };

  const togglePanel = (panel: PanelId) =>
    setOpenPanel((current) => (current === panel ? null : panel));

  // Keep rendering while inertia, auto-rotate or a camera animation is live.
  const needsContinuousFrames =
    !reducedMotion && (dragging || autoRotate || cameraTarget !== null);

  const visible = entered && !closing;
  // 320ms in, 260ms out — inside the 250–400ms feel the design calls for.
  const transition = reducedMotion
    ? 'none'
    : closing
      ? 'opacity 260ms cubic-bezier(0.4, 0, 1, 1), transform 260ms cubic-bezier(0.4, 0, 1, 1)'
      : 'opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';

  const infoRows = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    if (info?.name) rows.push({ label: 'Model', value: info.name });
    if (info?.client) rows.push({ label: 'Client', value: info.client });
    if (info?.project) rows.push({ label: 'Project', value: info.project });
    if (stats?.triangles) rows.push({ label: 'Polygons', value: formatCount(stats.triangles) });
    if (stats?.vertices) rows.push({ label: 'Vertices', value: formatCount(stats.vertices) });
    if (stats?.meshes) rows.push({ label: 'Meshes', value: formatCount(stats.meshes) });
    if (stats?.materials.length) {
      rows.push({ label: 'Materials', value: stats.materials.slice(0, 4).join(', ') });
    }
    if (info?.fileSizeBytes) {
      rows.push({ label: 'File size', value: formatBytes(info.fileSizeBytes) });
    }
    if (stats?.dimensions) {
      const [x, y, z] = stats.dimensions;
      // Normalized units, not source units — labelled as ratio to avoid
      // implying millimetres the source file never told us about.
      rows.push({
        label: 'Proportions',
        value: `${x.toFixed(2)} × ${y.toFixed(2)} × ${z.toFixed(2)}`,
      });
    }
    return rows;
  }, [info, stats]);

  /**
   * Wireframe draws one line per triangle edge. Past roughly a quarter-million
   * triangles that costs more than the shaded pass and can lock the tab for
   * seconds on integrated GPUs — measured against the 1M-triangle Coca-Cola
   * model in this CMS, which stalled the renderer outright. The control is
   * disabled rather than hidden so the capability stays discoverable.
   */
  const WIREFRAME_TRIANGLE_LIMIT = 250_000;
  const wireframeTooCostly = (stats?.triangles ?? 0) > WIREFRAME_TRIANGLE_LIMIT;

  // A model that streams in denser than the limit must not stay in wireframe.
  useEffect(() => {
    if (wireframeTooCostly) setWireframe(false);
  }, [wireframeTooCostly]);

  const toolbarButtons: {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
  }[] = [
    { id: 'reset', label: 'Reset camera', icon: <IconReset />, onClick: resetView },
    { id: 'fit', label: 'Fit model to view', icon: <IconFit />, onClick: fitModel },
    {
      id: 'autorotate',
      label: autoRotate ? 'Turn auto-rotate off' : 'Turn auto-rotate on',
      icon: <IconRotate />,
      onClick: () => setAutoRotate((v) => !v),
      active: autoRotate,
    },
    {
      id: 'wireframe',
      label: wireframeTooCostly
        ? 'Wireframe unavailable — model is too dense'
        : wireframe
          ? 'Hide wireframe'
          : 'Show wireframe',
      icon: <IconWireframe />,
      onClick: () => setWireframe((v) => !v),
      active: wireframe,
      disabled: wireframeTooCostly,
    },
    {
      id: 'lights',
      label: lightsOn ? 'Turn studio lights off' : 'Turn studio lights on',
      icon: <IconLight />,
      onClick: () => setLightsOn((v) => !v),
      active: lightsOn,
    },
    {
      id: 'background',
      label: showBackground ? 'Use transparent background' : 'Show environment background',
      icon: <IconBackground />,
      onClick: () => setShowBackground((v) => !v),
      active: showBackground,
    },
    { id: 'screenshot', label: 'Download screenshot', icon: <IconCamera />, onClick: screenshot },
  ];

  const panelTabs: { id: PanelId; label: string }[] = [
    { id: 'environment', label: 'Environment' },
    { id: 'lighting', label: 'Lighting' },
    { id: 'camera', label: 'Camera' },
    { id: 'animation', label: 'Animation' },
    { id: 'info', label: 'Info' },
  ];

  // Portalled to <body>. The viewer is rendered from inside the gallery, whose
  // ancestors carry transforms and scroll-reveal effects — and a transformed
  // ancestor becomes the containing block for position:fixed, which otherwise
  // clips this overlay to the tile and lets the site header paint over it.
  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      // z-index above every other layer in the app (chat widget, nav, scroll
      // progress, draft banner all sit at 80 or below).
      className="fixed inset-0 z-[200] flex flex-col bg-ink/90 backdrop-blur-2xl"
      style={{ opacity: visible ? 1 : 0, transition }}
      onPointerUp={onBackdropPointerUp}
    >
      <h2 id={titleId} className="sr-only">
        {ariaLabel} — fullscreen 3D viewer
      </h2>

      {/* Canvas layer — must stay an untransformed, full-viewport box; see the
          note on the <Canvas> style below. */}
      <div
        className="absolute inset-0"
        onPointerDown={() => {
          pointerInsideRef.current = true;
        }}
        // pointerup fires on the canvas before bubbling to the backdrop, so the
        // flag has to survive one tick past the release.
        onPointerUp={() => {
          requestAnimationFrame(() => {
            pointerInsideRef.current = false;
          });
        }}
      >
        <Canvas
          camera={{ position: OPENING_POSITION.toArray(), fov: 45 }}
          dpr={[1, 2]}
          // Screenshots need the buffer kept; fullscreen always offers one.
          gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
          frameloop={needsContinuousFrames ? 'always' : 'demand'}
          onCreated={({ gl }) => {
            canvasElRef.current = gl.domElement;
            // <Canvas> does not forward DOM attributes; set the accessible name
            // and keyboard reachability on the element directly.
            gl.domElement.setAttribute('role', 'img');
            gl.domElement.setAttribute('aria-label', ariaLabel);
            gl.domElement.setAttribute('tabindex', '0');
          }}
          // Opacity only — deliberately NO transform here. r3f sizes the
          // drawing buffer from a ResizeObserver on the parent and does not
          // re-measure when a transform later animates away, so scaling this
          // element leaves the canvas permanently at 94% of the viewport
          // (measured: 1353x846 inside a 1440x900 overlay). The "grows out of
          // the page" motion comes from the camera easing OPENING_POSITION ->
          // SETTLED_POSITION instead, which costs no layout at all.
          style={{
            touchAction: 'none',
            outline: 'none',
            opacity: visible ? 1 : 0,
            transition,
          }}
        >
          {lightsOn ? (
            <>
              <ambientLight intensity={lighting.ambient} />
              {/* Key / fill / rim, the standard three-point setup. */}
              <directionalLight position={[5, 5, 5]} intensity={lighting.key} />
              <directionalLight position={[-5, 1.5, 3]} intensity={lighting.fill} />
              <directionalLight position={[0, 3, -6]} intensity={lighting.rim} />
            </>
          ) : null}

          <Suspense fallback={null}>
            <Stage
              url={url}
              modelXOffset={modelXOffset}
              modelYOffset={modelYOffset}
              // Fullscreen is a driven view: OrbitControls owns the camera and
              // hover-follow motion would fight the user's drag.
              enableMouseParallax={false}
              enableHoverRotation={false}
              // Auto-rotate is handled by OrbitControls here so it orbits the
              // camera around the model rather than spinning the model in place.
              autoRotate={false}
              autoRotateSpeed={autoRotateSpeed}
              reducedMotion={reducedMotion}
              wireframe={wireframe}
              onStats={setStats}
            />
            <Environment preset={environment} background={showBackground} />
          </Suspense>

          <ControlsBridge
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            reducedMotion={reducedMotion}
            onDragChange={setDragging}
            onUserTakeover={onUserTakeover}
            controlsRef={controlsRef}
          />
          <CameraAnimator
            target={cameraTarget}
            reducedMotion={reducedMotion}
            onArrive={onArrive}
          />
          <DemandDriver active={needsContinuousFrames} />
        </Canvas>
      </div>

      {/* ---- Top bar: close + reset ---- */}
      {/* The chrome carries the scale part of the enter/exit animation — it has
          no WebGL buffer to mis-measure, so it can be transformed freely. */}
      <div
        className="pointer-events-none relative z-10 flex items-start justify-between gap-3 p-4 md:p-6"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(-8px)',
          opacity: visible ? 1 : 0,
          transition,
        }}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={requestClose}
          aria-label="Close fullscreen viewer"
          className="pointer-events-auto flex h-11 items-center gap-2 rounded-full glass px-4 text-sm text-white/80 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.9)] transition-colors duration-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
        >
          <IconClose />
          <span className="hidden sm:inline">Close</span>
        </button>

        <button
          type="button"
          onClick={resetView}
          className="pointer-events-auto flex h-11 items-center gap-2 rounded-full glass px-4 text-sm text-white/80 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.9)] transition-colors duration-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
        >
          <IconReset />
          <span className="hidden sm:inline">Reset view</span>
        </button>
      </div>

      {/* ---- Floating tool rail ---- */}
      {/* Desktop: a vertical rail on the right, clear of the model. Mobile: the
          same actions behind one floating button so they don't crowd the view. */}
      <div className="pointer-events-none absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 md:block">
        <div className="pointer-events-auto flex flex-col gap-1 rounded-2xl glass p-1.5 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.9)]">
          {toolbarButtons.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={b.onClick}
              aria-label={b.label}
              title={b.label}
              aria-pressed={b.active === undefined ? undefined : b.active}
              disabled={b.disabled}
              className={`grid h-10 w-10 place-items-center rounded-xl transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent ${
                b.active
                  ? 'bg-brand-cyan/15 text-brand-cyan'
                  : 'text-white/65 hover:bg-white/10 hover:text-white'
              }`}
            >
              {b.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile collapsed tool menu */}
      <div className="pointer-events-none absolute bottom-24 right-4 z-10 md:hidden">
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {mobileToolbarOpen ? (
            <div className="flex flex-col gap-1 rounded-2xl glass p-1.5 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.9)]">
              {toolbarButtons.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={b.onClick}
                  aria-label={b.label}
                  aria-pressed={b.active === undefined ? undefined : b.active}
                  disabled={b.disabled}
                  className={`grid h-11 w-11 place-items-center rounded-xl transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent ${
                    b.active
                      ? 'bg-brand-cyan/15 text-brand-cyan'
                      : 'text-white/65 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {b.icon}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setMobileToolbarOpen((v) => !v)}
            aria-label={mobileToolbarOpen ? 'Hide viewer tools' : 'Show viewer tools'}
            aria-expanded={mobileToolbarOpen}
            className="grid h-12 w-12 place-items-center rounded-full glass text-white/80 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.9)] transition-colors duration-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
          >
            {mobileToolbarOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {/* ---- Bottom dock: panel tabs + the open panel ----
          mt-auto pins it to the bottom of the flex column, leaving the rest of
          the viewport (~85%) as model space. */}
      <div
        className="pointer-events-none relative z-10 mt-auto flex flex-col items-center gap-2 p-4 md:p-6"
        style={{
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
          opacity: visible ? 1 : 0,
          transition,
        }}
      >
        {openPanel ? (
          <div className="pointer-events-auto w-full max-w-md rounded-2xl glass p-4 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.95)]">
            {openPanel === 'environment' ? (
              <fieldset>
                <legend className="mb-3 text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Environment
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {FULLSCREEN_ENVIRONMENTS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setEnvironment(preset.id)}
                      aria-pressed={environment === preset.id}
                      className={`rounded-full px-3 py-1.5 text-xs transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan ${
                        environment === preset.id
                          ? 'bg-brand-cyan/15 text-brand-cyan'
                          : 'bg-white/[0.06] text-white/65 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {openPanel === 'lighting' ? (
              <fieldset className="space-y-3.5">
                <legend className="mb-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Lighting
                </legend>
                <Slider
                  label="Ambient"
                  value={lighting.ambient}
                  onChange={(v) => setLighting((l) => ({ ...l, ambient: v }))}
                />
                <Slider
                  label="Key light"
                  value={lighting.key}
                  onChange={(v) => setLighting((l) => ({ ...l, key: v }))}
                />
                <Slider
                  label="Fill light"
                  value={lighting.fill}
                  onChange={(v) => setLighting((l) => ({ ...l, fill: v }))}
                />
                <Slider
                  label="Rim light"
                  value={lighting.rim}
                  onChange={(v) => setLighting((l) => ({ ...l, rim: v }))}
                />
                <button
                  type="button"
                  onClick={() => setLighting(DEFAULT_LIGHTING)}
                  className="text-xs text-white/50 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
                >
                  Reset lighting
                </button>
              </fieldset>
            ) : null}

            {openPanel === 'camera' ? (
              <fieldset>
                <legend className="mb-3 text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Camera presets
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LABELS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => goToPreset(p.id)}
                      className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-white/65 transition-colors duration-300 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {openPanel === 'animation' ? (
              <fieldset className="space-y-3">
                <legend className="mb-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Animation
                </legend>
                <button
                  type="button"
                  onClick={() => setAutoRotate((v) => !v)}
                  aria-pressed={autoRotate}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan ${
                    autoRotate
                      ? 'bg-brand-cyan/15 text-brand-cyan'
                      : 'bg-white/[0.06] text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Auto-rotate
                  <span className="text-xs uppercase tracking-[0.12em]">
                    {autoRotate ? 'On' : 'Off'}
                  </span>
                </button>
                {reducedMotion ? (
                  <p className="text-xs text-white/45">
                    Motion is reduced to match your system setting, so animation stays off.
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            {openPanel === 'info' ? (
              infoRows.length > 0 ? (
                <dl>
                  <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                    Model information
                  </div>
                  {infoRows.map((row) => (
                    <InfoRow key={row.label} label={row.label} value={row.value} />
                  ))}
                </dl>
              ) : (
                <p className="text-xs text-white/45">No model details available.</p>
              )
            ) : null}
          </div>
        ) : null}

        <div
          role="tablist"
          aria-label="Viewer settings"
          className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full glass p-1.5 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.9)]"
        >
          {panelTabs.map((tab) => {
            const selected = openPanel === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => togglePanel(tab.id)}
                className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-xs transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan ${
                  selected
                    ? 'bg-brand-cyan/15 text-brand-cyan'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.label}
                <IconChevron
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${selected ? 'rotate-180' : ''}`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
