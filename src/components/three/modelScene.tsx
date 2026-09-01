'use client';

// Scene internals shared by the inline ModelViewer and the fullscreen viewer.
//
// Extracted so both viewers go through the *same* loader calls. r3f's loader
// caches (useGLTF / useLoader) are keyed by URL and global to the page, so when
// the fullscreen overlay mounts it resolves from cache: no second network
// request, no second parse, no loading spinner. That is what makes opening
// fullscreen feel like the inline model growing rather than a fresh load.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export type ModelFormat = 'gltf' | 'fbx' | 'obj';

export function formatOf(url: string): ModelFormat {
  // Blob URLs carry a query string; compare against the path only.
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.fbx')) return 'fbx';
  if (path.endsWith('.obj')) return 'obj';
  return 'gltf'; // .glb and .gltf share the same loader
}

/** Geometry/material totals for the fullscreen info panel. */
export type ModelStats = {
  triangles: number;
  vertices: number;
  meshes: number;
  materials: string[];
  /** Bounding-box size in normalized viewer units (longest axis is 2). */
  dimensions: [number, number, number] | null;
};

/**
 * Walk a loaded object and total up what the info panel shows. Counting is
 * cheap relative to the load itself and only runs once per (cached) model.
 */
export function statsOf(object: THREE.Object3D): ModelStats {
  let triangles = 0;
  let vertices = 0;
  let meshes = 0;
  const materials = new Set<string>();

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    meshes += 1;
    const geometry = child.geometry as THREE.BufferGeometry | undefined;
    const position = geometry?.getAttribute('position');
    if (position) {
      vertices += position.count;
      // Indexed geometry stores triangles in the index buffer; non-indexed
      // stores three positions per face.
      triangles += geometry?.index ? geometry.index.count / 3 : position.count / 3;
    }
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (material) materials.add(material.name || material.type);
    }
  });

  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const dimensions: [number, number, number] | null = Number.isFinite(size.x)
    ? [size.x, size.y, size.z]
    : null;

  return {
    triangles: Math.round(triangles),
    vertices,
    meshes,
    materials: [...materials].sort(),
    dimensions,
  };
}

/**
 * Scale to unit size and centre on the origin, so wildly different source
 * models (a 0.01-unit CAD export, a 500-unit scan) all frame identically.
 */
export function normalize(object: THREE.Object3D): THREE.Object3D {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z);

  const group = new THREE.Group();
  // Guard against degenerate/empty geometry producing Infinity or 0.
  const scale = maxAxis > 0 && Number.isFinite(maxAxis) ? 2 / maxAxis : 1;
  object.position.sub(center);
  group.add(object);
  group.scale.setScalar(scale);
  return group;
}

type ModelProps = {
  url: string;
  onStats?: (stats: ModelStats) => void;
};

/** Reports stats once per normalized object, without re-running on re-render. */
function useReportStats(object: THREE.Object3D, onStats?: (stats: ModelStats) => void) {
  useEffect(() => {
    if (!onStats) return;
    onStats(statsOf(object));
  }, [object, onStats]);
}

function GltfModel({ url, onStats }: ModelProps) {
  const { scene } = useGLTF(url);
  // Clone so the same cached model can appear more than once on a page — the
  // inline viewer and the fullscreen overlay each get their own instance while
  // sharing one parse.
  const object = useMemo(() => normalize(scene.clone(true)), [scene]);
  useReportStats(object, onStats);
  return <primitive object={object} />;
}

function FbxModel({ url, onStats }: ModelProps) {
  const fbx = useLoader(FBXLoader, url);
  const object = useMemo(() => normalize(fbx.clone(true)), [fbx]);
  useReportStats(object, onStats);
  return <primitive object={object} />;
}

function ObjModel({ url, onStats }: ModelProps) {
  const obj = useLoader(OBJLoader, url);
  const object = useMemo(() => {
    const cloned = obj.clone(true);
    // OBJ files carry no materials of their own without an MTL; give meshes a
    // sane PBR material so the environment lighting actually shows.
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.material) {
        child.material = new THREE.MeshStandardMaterial({ color: '#cccccc', roughness: 0.6 });
      }
    });
    return normalize(cloned);
  }, [obj]);
  useReportStats(object, onStats);
  return <primitive object={object} />;
}

/** Picks the loader for a URL's extension. Suspends until the model resolves. */
export function Model({ url, onStats }: ModelProps) {
  const format = formatOf(url);
  if (format === 'fbx') return <FbxModel url={url} onStats={onStats} />;
  if (format === 'obj') return <ObjModel url={url} onStats={onStats} />;
  return <GltfModel url={url} onStats={onStats} />;
}

/**
 * Holds the model and applies offsets, hover rotation and pointer parallax.
 * All motion is frame-rate independent and disabled under reduced-motion.
 */
export function Stage({
  url,
  modelXOffset,
  modelYOffset,
  enableMouseParallax,
  enableHoverRotation,
  autoRotate,
  autoRotateSpeed,
  reducedMotion,
  wireframe = false,
  onLoaded,
  onStats,
}: {
  url: string;
  modelXOffset: number;
  modelYOffset: number;
  enableMouseParallax: boolean;
  enableHoverRotation: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
  reducedMotion: boolean;
  wireframe?: boolean;
  onLoaded?: () => void;
  onStats?: (stats: ModelStats) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  // Fires after the Suspense boundary resolves — i.e. the model is ready.
  useEffect(() => {
    onLoaded?.();
  }, [onLoaded]);

  // Wireframe flips the flag on the live materials rather than swapping them,
  // so PBR settings survive a toggle round-trip.
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        if (material && 'wireframe' in material) {
          (material as THREE.MeshStandardMaterial).wireframe = wireframe;
        }
      }
    });
  }, [wireframe]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g || reducedMotion) return;

    // Clamp delta so a backgrounded tab doesn't resume with a huge jump.
    const dt = Math.min(delta, 0.1);

    if (autoRotate) g.rotation.y += autoRotateSpeed * dt;

    // pointer is already normalised to [-1, 1] over the canvas.
    const targetY = enableHoverRotation ? pointer.x * 0.35 : 0;
    const targetX = enableMouseParallax ? -pointer.y * 0.2 : 0;

    if (enableHoverRotation && !autoRotate) {
      g.rotation.y += (targetY - g.rotation.y) * Math.min(1, dt * 4);
    }
    if (enableMouseParallax) {
      g.rotation.x += (targetX - g.rotation.x) * Math.min(1, dt * 4);
    }
  });

  return (
    <group
      ref={group}
      position={[modelXOffset, modelYOffset, 0]}
      // Open on a slight turn so flat-fronted models show depth immediately
      // instead of presenting as a 2D rectangle on first paint.
      rotation={[0, -0.5, 0]}
    >
      <Model url={url} onStats={onStats} />
    </group>
  );
}
