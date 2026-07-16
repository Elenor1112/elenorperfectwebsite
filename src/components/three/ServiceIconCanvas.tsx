'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { AlNesrBadge } from './AlNesrBadge';

function Mark({ shape, color }: { shape: string; color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // subtle scroll reactivity layered on idle rotation
    const scrollFactor = typeof window !== 'undefined' ? window.scrollY * 0.0008 : 0;
    ref.current.rotation.x = t * 0.25 + scrollFactor;
    ref.current.rotation.y = t * 0.35 + scrollFactor;
  });

  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={0.8}>
      <mesh ref={ref}>
        {shape === 'torus' && <torusKnotGeometry args={[0.9, 0.28, 128, 24]} />}
        {shape === 'octa' && <octahedronGeometry args={[1.3, 0]} />}
        {shape === 'sphere' && <icosahedronGeometry args={[1.25, 1]} />}
        {(shape === 'box' || !['torus', 'octa', 'sphere'].includes(shape)) && (
          <boxGeometry args={[1.6, 1.6, 1.6]} />
        )}
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.7}
          emissive={color}
          emissiveIntensity={0.25}
          toneMapped={false}
        />
      </mesh>
    </Float>
  );
}

export function ServiceIconCanvas({ shape, color }: { shape: string; color: string }) {
  // Bare Canvas — the sized/rounded wrapper lives in ServiceIcon so this can
  // mount as an overlay layer on top of the CSS fallback.
  return (
    <Canvas
      className="!h-full !w-full"
      camera={{ position: [0, 0, 4.5], fov: 45 }}
      dpr={[1, 1.8]}
      gl={{ alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-5, -3, 2]} intensity={0.8} color={color} />
      {shape === 'badge' ? <AlNesrBadge /> : <Mark shape={shape} color={color} />}
      <Environment preset="city" />
    </Canvas>
  );
}
