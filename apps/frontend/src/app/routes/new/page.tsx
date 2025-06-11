'use client';

import { useState } from 'react';
import { Map } from '@/components/Map/Map';
import { Button, Card } from '@mapit/ui';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';

export default function NewRoutePage() {
  const router = useRouter();
  const [routeName, setRouteName] = useState('');
  const [description, setDescription] = useState('');
  const [waypoints, setWaypoints] = useState<Array<{ lat: number; lng: number }>>([]);
  
  const createRoute = trpc.routes.create.useMutation({
    onSuccess: (data) => {
      console.log('Route created:', data);
      router.push(`/routes/${data.id}`);
    },
    onError: (error) => {
      console.error('Error creating route:', error);
    },
  });

  const handleSaveRoute = () => {
    if (!routeName || waypoints.length < 2) {
      alert('Please enter a route name and add at least 2 waypoints');
      return;
    }

    createRoute.mutate({
      name: routeName,
      description: description || undefined,
      waypoints: waypoints.map((wp, index) => ({
        ...wp,
        name: `Waypoint ${index + 1}`,
      })),
    });
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-96 bg-gray-50 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Create New Route</h1>
        
        <Card className="mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Route Name
              </label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="My Amazing Journey"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Describe your route..."
              />
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold mb-3">Waypoints ({waypoints.length})</h3>
          {waypoints.length === 0 ? (
            <p className="text-sm text-gray-600">
              Click on the map to add waypoints
            </p>
          ) : (
            <div className="space-y-2">
              {waypoints.map((wp, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">Point {index + 1}:</span>{' '}
                  {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Button
            onClick={handleSaveRoute}
            disabled={createRoute.isPending || waypoints.length < 2}
            className="w-full"
          >
            {createRoute.isPending ? 'Saving...' : 'Save Route'}
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => router.push('/')}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <Map onRouteChange={setWaypoints} />
      </div>
    </div>
  );
}