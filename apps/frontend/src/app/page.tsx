'use client';

import { Button } from '@mapit/ui';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

export default function HomePage() {
  const router = useRouter();
  const { data: health } = trpc.health.useQuery();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 text-4xl font-bold">Welcome to MapIt</h1>
      <p className="mb-8 text-xl text-gray-600">
        Transform your travel routes into beautiful animated videos
      </p>
      
      <div className="space-y-4">
        <Button size="lg" onClick={() => router.push('/routes/new')}>
          Create New Route
        </Button>
        
        {health && (
          <p className="text-sm text-gray-500">
            Backend status: {health.status}
          </p>
        )}
      </div>
    </main>
  );
}