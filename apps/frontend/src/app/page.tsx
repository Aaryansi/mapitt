// Create this file: apps/frontend/src/app/routes/page.tsx

'use client';

import { Button, Card } from '@mapit/ui';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';

export default function RoutesPage() {
  const router = useRouter();
  const { data, isLoading, error } = trpc.routes.list.useQuery({
    skip: 0,
    take: 20,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Loading routes...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-red-600">Error loading routes</h1>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Routes</h1>
          <Button onClick={() => router.push('/routes/new')}>
            Create New Route
          </Button>
        </div>

        {data?.routes.length === 0 ? (
          <Card>
            <p className="text-gray-600 text-center py-8">
              No routes yet. Create your first route!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.routes.map((route) => (
              <Card
                key={route.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/routes/${route.id}`)}
              >
                <h3 className="font-semibold text-lg mb-2">{route.name}</h3>
                {route.description && (
                  <p className="text-gray-600 text-sm mb-4">{route.description}</p>
                )}
                <div className="text-sm text-gray-500">
                  <p>{route.waypoints.length} waypoints</p>
                  <p>Created: {new Date(route.createdAt).toLocaleDateString()}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}