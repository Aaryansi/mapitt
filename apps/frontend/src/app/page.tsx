'use client';

// apps/frontend/src/app/page.tsx
import dynamic from 'next/dynamic';
import HeroSection from '@/components/Landing/HeroSection';
import FeatureCards from '@/components/Landing/FeatureCards';
import HowItWorks from '@/components/Landing/HowItWorks';

// Dynamic import for GlobeBackground to avoid SSR issues with Three.js
const GlobeBackground = dynamic(
  () => import('@/components/Landing/GlobeBackground'),
  { 
    ssr: false,
    loading: () => <div style={{ position: 'absolute', inset: 0, zIndex: -10, background: 'radial-gradient(ellipse at center, #0f172a 0%, #000000 100%)' }} />
  }
);

export default function HomePage() {
  return (
    <main style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      <GlobeBackground />
      <HeroSection />
      <FeatureCards />
      <HowItWorks />
    </main>
  );
}