'use client';

// apps/frontend/src/components/Landing/GlobeBackground.tsx
import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Globe mesh component
function Globe() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Auto-rotate the globe
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  // Create texture for Earth-like appearance
  const globeMaterial = useMemo(() => {
    const material = new THREE.MeshPhongMaterial({
      color: '#1a237e',
      emissive: '#311b92',
      emissiveIntensity: 0.2,
      shininess: 100,
      specular: new THREE.Color('#4fc3f7'),
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    return material;
  }, []);

  return (
    <mesh ref={meshRef} material={globeMaterial}>
      <sphereGeometry args={[2.5, 64, 64]} />
    </mesh>
  );
}

// Ambient lighting setup
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />
      <pointLight position={[-10, -10, -5]} intensity={0.3} color="#b388ff" />
    </>
  );
}

export default function GlobeBackground() {
  return (
    <div 
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: -10,
        background: 'radial-gradient(ellipse at center, #0f172a 0%, #000000 100%)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Lighting />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Globe />
        <fog attach="fog" args={['#0f172a', 5, 15]} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}