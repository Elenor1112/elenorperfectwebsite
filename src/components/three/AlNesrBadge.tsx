'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Decal, useTexture, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Premium injection-molded polymer badge carrying the Al-Nesr Al-Jawhari mark
// as a flat printed decal. Swap logoTextureUrl for the real 2048x2048
// transparent logo atlas when available (green #1F4B40/#2F6657, gold #C89A2B).
export function AlNesrBadge({
  logoTextureUrl = '/assets/al-nesr-al-jawhari/logo.svg',
}: {
  logoTextureUrl?: string;
}) {
  const badgeRef = useRef<THREE.Mesh>(null);

  const logoTexture = useTexture(logoTextureUrl, (t) => {
    (t as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
  });

  // 1. Generate the organic, soft asymmetrical circular silhouette
  const badgeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 64;
    const radius = 1.2; // ~2.4 units wide overall

    for (let i = 0; i <= points; i++) {
      const theta = (i / points) * Math.PI * 2;
      // Introduce subtle, organic variation to break perfect circularity
      const organicWobble = 1.0 + Math.sin(theta * 3) * 0.03 + Math.cos(theta * 5) * 0.01;
      const x = Math.cos(theta) * radius * organicWobble;
      const y = Math.sin(theta) * radius * organicWobble;

      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }

    // Extrude settings to achieve the 6mm feel with a large, smooth front bevel
    const extrudeSettings = {
      steps: 1,
      depth: 0.15, // ~6mm depth scaled
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelOffset: 0,
      bevelSegments: 8, // Smooth rounded transition
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // 2. Continuous elegant floating & rotation tracking
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (badgeRef.current) {
      // Gentle cinematic breathing rotation
      badgeRef.current.rotation.y = Math.sin(t * 0.5) * 0.15;
      badgeRef.current.rotation.x = Math.cos(t * 0.3) * 0.08;
    }
  });

  return (
    <group>
      {/* Cinematic slow floating wrapper */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
        <mesh ref={badgeRef} geometry={badgeGeometry} castShadow receiveShadow>
          {/* Main Body: Premium Matte Injection-Molded Polymer */}
          <meshPhysicalMaterial
            color="#F8F8F6"          // Soft Premium White
            roughness={0.5}          // Satin finish
            metalness={0.0}          // Pure non-metallic polymer
            clearcoat={0.1}          // Extremely subtle outer factory sheen
            clearcoatRoughness={0.4} // Softens clearcoat highlights
            envMapIntensity={1.2}    // Beautiful HDRI reflection response
          />

          {/* Logo Decal: Crisp, flat printed graphic (No extrusion/embossing) */}
          <Decal
            position={[0, 0, 0.16]}  // Projected perfectly flat on the slightly convex face
            rotation={[0, 0, 0]}
            scale={[1.6, 1.6, 1]}    // Proportionate scaling
          >
            <meshBasicMaterial
              map={logoTexture}
              transparent
              polygonOffset
              polygonOffsetFactor={-4} // Prevents z-fighting on the flat face
            />
          </Decal>
        </mesh>
      </Float>

      {/* Premium Studio Soft Contact Shadow */}
      <ContactShadows
        position={[0, -1.8, 0]}
        opacity={0.4}
        scale={6}
        blur={2.4}
        far={3}
      />
    </group>
  );
}
