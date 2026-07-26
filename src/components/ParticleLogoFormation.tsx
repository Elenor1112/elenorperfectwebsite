'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import elenorMark from '@/assets/elenor-mark.png';

// Design-space size the particle field is laid out in — matches the trimmed
// elenor-mark.png aspect ratio (1765x593) so sampled particle positions map
// 1:1 onto the flat logo crossfaded in at the end. The parent scales the
// whole canvas via CSS to whatever on-screen size it needs.
export const PARTICLE_DESIGN = { width: 1765, height: 593 };

const PARTICLE_COUNT = 3600;

/** GSAP-driven "phase" the shader reads every frame — 0..1 within each stage. */
export type ParticlePhase = {
  /** 0 = scattered resting dust, 1 = fully formed logo silhouette. */
  formation: number;
  /** 0 = still, 1 = full idle drift/vibration energy. */
  energy: number;
  /** Overall opacity of the whole particle field (for the final handoff fade). */
  opacity: number;
  /** Opacity of the real flat-logo texture crossfaded in during solidification (0 = hidden, 1 = fully solid) — rendered in the same scene/coordinate space as the particles, so the merge has perfect pixel registration. */
  logoOpacity: number;
};

export type ParticleLogoFormationHandle = {
  /** Imperatively push new phase values into the running shader (called every GSAP tick — avoids React re-renders for a 60fps-driven value). */
  setPhase: (phase: ParticlePhase) => void;
  /** Resolves once the logo's pixel data has been sampled and particle target positions are ready. */
  ready: Promise<void>;
};

// Samples elenor-mark.png's alpha channel on an offscreen canvas to build a
// list of (x, y) target points inside the logo silhouette, in the same
// PARTICLE_DESIGN coordinate space the shader positions particles in. Runs
// once client-side so it always matches the real asset with no build step.
async function sampleLogoPositions(count: number): Promise<Float32Array> {
  const img = new window.Image();
  img.src = (elenorMark as unknown as { src: string }).src;
  await img.decode();

  const canvas = document.createElement('canvas');
  const w = 480; // sampling resolution — plenty for a particle field this size
  const h = Math.round(w * (img.naturalHeight / img.naturalWidth));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const candidates: { x: number; y: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 80) candidates.push({ x, y });
    }
  }

  const positions = new Float32Array(count * 2);
  const scaleX = PARTICLE_DESIGN.width / w;
  const scaleY = PARTICLE_DESIGN.height / h;

  if (!candidates.length) {
    for (let i = 0; i < count; i++) {
      positions[i * 2] = (w / 2) * scaleX;
      positions[i * 2 + 1] = (h / 2) * scaleY;
    }
    return positions;
  }

  // Even, stratified fill instead of naive random-with-replacement. Uniform
  // random sampling clumps (Poisson noise): with only ~3,600 points spread
  // across a wide 6-letter wordmark, some strokes got several overlapping
  // particles while others were left with gaps, so the silhouette read as
  // sparse dust rather than legible letterforms. Here every particle is
  // assigned to a distinct silhouette pixel spaced evenly through the shuffled
  // candidate list, then nudged within its own pixel cell — so coverage is
  // uniform across every stroke of every letter and the logo reads cleanly.

  // Fisher–Yates shuffle so the evenly-strided pick isn't biased by the
  // row-major scan order (which would otherwise favor a diagonal comb).
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }

  // Half-pixel jitter (in design space) breaks up the single-pixel grid so
  // dense strokes don't look like a hard raster, while staying inside the
  // silhouette. Kept small so the settled shape is still crisp.
  const jitterX = scaleX * 0.5;
  const jitterY = scaleY * 0.5;
  // Even stride across the shuffled candidates: when there are more silhouette
  // pixels than particles (the usual case) this walks the whole list with a
  // fixed step so coverage stays uniform; the modulo wrap keeps it correct
  // (extra particles reuse cells evenly) if count ever exceeds candidates.
  const stride = Math.max(1, Math.floor(candidates.length / count));
  for (let i = 0; i < count; i++) {
    const c = candidates[(i * stride) % candidates.length];
    positions[i * 2] = c.x * scaleX + (Math.random() - 0.5) * jitterX;
    positions[i * 2 + 1] = c.y * scaleY + (Math.random() - 0.5) * jitterY;
  }
  return positions;
}

const VERTEX_SHADER = /* glsl */ `
  attribute vec2 aScatter;
  attribute vec2 aTarget;
  attribute float aSeed;
  attribute float aSize;

  uniform float uFormation;    // 0 = scattered, 1 = formed
  uniform float uEnergy;       // 0..1 idle drift amount
  uniform float uTime;
  uniform float uDesignHeight; // PARTICLE_DESIGN.height — for the y-flip below

  varying float vAlpha;
  varying float vSeed;

  // Smoothstep-based ease so the flow reads as fluid attraction, not linear.
  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    vSeed = aSeed;

    // Per-particle phase offset so the flock doesn't move in lockstep —
    // reads as organic murmuration rather than a single rigid transform.
    float staggeredT = clamp(uFormation * 1.35 - aSeed * 0.35, 0.0, 1.0);
    float eased = easeInOutCubic(staggeredT);

    vec2 pos = mix(aScatter, aTarget, eased);

    // Idle drift / vibration: strongest before formation starts, fades out
    // as particles commit to their target (a settled logo shouldn't jitter).
    float driftAmount = uEnergy * (1.0 - eased * 0.85);
    float driftX = sin(uTime * 1.6 + aSeed * 62.0) * driftAmount * 6.0;
    float driftY = cos(uTime * 1.3 + aSeed * 41.0) * driftAmount * 6.0;
    pos += vec2(driftX, driftY);

    // A gentle upward arc mid-flight (attraction "lift") rather than a
    // straight-line drag — peaks at eased=0.5, gone at both ends.
    float arc = sin(eased * 3.14159265) * (1.0 - aSeed * 0.4);
    pos.y -= arc * 34.0;

    vAlpha = mix(0.55, 1.0, eased);

    // aScatter/aTarget are sampled in image space (y increases downward), but
    // the camera views a standard y-up world. Flip y about the design height so
    // the silhouette (and the flat LogoPlane, which shares this frame) reads
    // right-side-up instead of upside-down.
    pos.y = uDesignHeight - pos.y;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 0.0, 1.0);
    gl_PointSize = aSize * (1.0 + (1.0 - eased) * 0.5) * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    // Soft round glow falloff instead of a hard square point sprite.
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.18, 0.0, d) * 0.6;
    float a = (glow * 0.7 + core) * vAlpha * uOpacity * (0.7 + 0.3 * fract(vSeed * 13.0));
    gl_FragColor = vec4(uColor, a);
  }
`;

function ParticleField({
  positionsReady,
  phaseRef,
}: {
  positionsReady: { scatter: Float32Array; target: Float32Array; seed: Float32Array; size: Float32Array } | null;
  phaseRef: React.MutableRefObject<ParticlePhase>;
}) {
  const geometry = useMemo(() => {
    if (!positionsReady) return null;
    const geo = new THREE.BufferGeometry();
    // `position` attribute: the shader computes real vertex positions from
    // aScatter/aTarget instead, but three.js still uses `position` to compute
    // the object's bounding sphere for frustum culling. An all-zero buffer
    // collapsed that sphere to a single point at the object's local origin —
    // far outside the camera's frustum (which looks at PARTICLE_DESIGN's
    // center) — so the whole Points object was silently culled every frame.
    // Seeding it with the scatter positions (which span the same coordinate
    // range as aTarget) gives three.js a correct, non-degenerate bounds.
    const position = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      position[i * 3] = positionsReady.scatter[i * 2];
      position[i * 3 + 1] = positionsReady.scatter[i * 2 + 1];
      position[i * 3 + 2] = 0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geo.setAttribute('aScatter', new THREE.BufferAttribute(positionsReady.scatter, 2));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(positionsReady.target, 2));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(positionsReady.seed, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(positionsReady.size, 1));
    return geo;
  }, [positionsReady]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uFormation: { value: 0 },
          uEnergy: { value: 0 },
          uTime: { value: 0 },
          uDesignHeight: { value: PARTICLE_DESIGN.height },
          uColor: { value: new THREE.Color('#5DCAA5') },
          uOpacity: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uFormation.value = phaseRef.current.formation;
    material.uniforms.uEnergy.value = phaseRef.current.energy;
    material.uniforms.uOpacity.value = phaseRef.current.opacity;
  });

  if (!geometry) return null;

  return <points geometry={geometry} material={material} />;
}

function LogoPlane({ phaseRef }: { phaseRef: React.MutableRefObject<ParticlePhase> }) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load((elenorMark as unknown as { src: string }).src);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame(() => {
    if (materialRef.current) materialRef.current.opacity = phaseRef.current.logoOpacity;
  });

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    // No scale flip: the vertex shader already converts the particles'
    // image-space y-down coordinates into the world's y-up frame (see
    // uDesignHeight in VERTEX_SHADER), so the plane's texture — mapped with its
    // top row at the plane's top — sits upright in the same frame and registers
    // with the particles. A previous scale.y=-1 double-flipped the mark, which
    // (with the camera fix) rendered "elenor" rotated 180° as "ieluo".
    <mesh position={[PARTICLE_DESIGN.width / 2, PARTICLE_DESIGN.height / 2, 1]}>
      <planeGeometry args={[PARTICLE_DESIGN.width, PARTICLE_DESIGN.height]} />
      <meshBasicMaterial ref={materialRef} map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => {
    // Orthographic-feeling perspective camera framed so the full
    // PARTICLE_DESIGN region maps onto the canvas regardless of container size.
    //
    // The frustum must be sized in the same units the particles live in
    // (PARTICLE_DESIGN units), NOT the canvas's pixel size. Deriving fov from
    // `size.height` framed `size.height` *design units* vertically — a
    // 400px-tall canvas then showed only the middle 400 of the logo's 593
    // units and the middle 1190 of its 1765 width, center-cropping the outer
    // letters and the top/bottom of every stroke. The surviving middle band of
    // "elenor" read as a broken, stretched "ieluo".
    //
    // The canvas CSS box always carries PARTICLE_DESIGN's own aspect ratio, so
    // we frame exactly PARTICLE_DESIGN.height vertically and let the matching
    // aspect cover the full width. A hair of padding keeps the outermost
    // particles (plus their glow/point-size) off the very edge.
    const cam = camera as THREE.PerspectiveCamera;
    const distance = 700;
    const PAD = 1.06;
    cam.position.set(PARTICLE_DESIGN.width / 2, PARTICLE_DESIGN.height / 2, distance);
    cam.lookAt(PARTICLE_DESIGN.width / 2, PARTICLE_DESIGN.height / 2, 0);
    cam.aspect = size.width / size.height;
    // Vertical span the camera must show: the design height, but widen it if
    // the canvas is proportionally narrower than the design so the full width
    // still fits (belt-and-braces against any aspect drift in the CSS box).
    const designAspect = PARTICLE_DESIGN.width / PARTICLE_DESIGN.height;
    const visibleHeight =
      PARTICLE_DESIGN.height * PAD * Math.max(1, designAspect / cam.aspect);
    cam.fov = (2 * Math.atan(visibleHeight / 2 / distance) * 180) / Math.PI;
    cam.near = 1;
    cam.far = 2000;
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/**
 * Renders thousands of glowing points that scatter across a resting field,
 * then flow into the exact silhouette of elenor-mark.png. Purely visual and
 * imperatively driven (see ParticleLogoFormationHandle) so the parent's GSAP
 * timeline can scrub `formation`/`energy`/`opacity` every tick without
 * triggering React renders.
 */
export const ParticleLogoFormation = forwardRef<ParticleLogoFormationHandle, { className?: string }>(
  function ParticleLogoFormation({ className }, ref) {
    const phaseRef = useRef<ParticlePhase>({ formation: 0, energy: 0, opacity: 1, logoOpacity: 0 });
    const [positions, setPositions] = useState<{
      scatter: Float32Array;
      target: Float32Array;
      seed: Float32Array;
      size: Float32Array;
    } | null>(null);
    const readyResolveRef = useRef<() => void>(() => {});
    const readyPromiseRef = useRef<Promise<void>>(
      new Promise((resolve) => {
        readyResolveRef.current = resolve;
      })
    );

    useEffect(() => {
      let cancelled = false;
      (async () => {
        const target = await sampleLogoPositions(PARTICLE_COUNT);
        if (cancelled) return;

        const scatter = new Float32Array(PARTICLE_COUNT * 2);
        const seed = new Float32Array(PARTICLE_COUNT);
        const size = new Float32Array(PARTICLE_COUNT);
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          // Scattered across a wide "ground" band beneath/around the logo
          // area — biased so particles feel grounded rather than floating
          // randomly in space.
          scatter[i * 2] = Math.random() * PARTICLE_DESIGN.width * 1.4 - PARTICLE_DESIGN.width * 0.2;
          scatter[i * 2 + 1] =
            PARTICLE_DESIGN.height * 0.65 + Math.random() * PARTICLE_DESIGN.height * 0.9;
          seed[i] = Math.random();
          size[i] = 2.2 + Math.random() * 3.2;
        }
        setPositions({ scatter, target, seed, size });
        readyResolveRef.current();
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        setPhase: (phase) => {
          phaseRef.current = phase;
        },
        ready: readyPromiseRef.current,
      }),
      []
    );

    return (
      <Canvas
        className={className}
        orthographic={false}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        dpr={[1, 1.75]}
        style={{ background: 'transparent' }}
      >
        <CameraRig />
        {/* Draw order matters: both materials disable depth testing, so
            scene-graph order (not z) decides what paints on top. Particles
            first, logo plane after — the plane is invisible (opacity 0)
            until the solidification stage fades it in over the particles. */}
        <ParticleField positionsReady={positions} phaseRef={phaseRef} />
        <LogoPlane phaseRef={phaseRef} />
      </Canvas>
    );
  }
);
