'use client';

import { useState, useCallback, useEffect } from 'react';
import { Map } from '@/components/Map/Map';
import { Button, Card } from '@mapit/ui';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Plane, Car, Train, PersonStanding, Trash2, MoreVertical } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  coordinates: [number, number];
  address?: string;
}

interface RouteSegment {
  from: Location;
  to: Location;
  mode: 'flight' | 'drive' | 'train' | 'walk';
}

const transportModes = [
  { id: 'flight', icon: Plane, label: 'Flight' },
  { id: 'drive', icon: Car, label: 'Drive' },
  { id: 'train', icon: Train, label: 'Train' },
  { id: 'walk', icon: PersonStanding, label: 'Walk' },
] as const;

export default function NewRoutePage() {
  const router = useRouter();
  const [isMultStyle, setIsMultStyle] = useState(true); // Toggle between old and new style
  const [routeName, setRouteName] = useState('');
  const [description, setDescription] = useState('');
  const [waypoints, setWaypoints] = useState<Array<{ lat: number; lng: number; name?: string }>>([]);
  
  // Mult.dev style states
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [toLocation, setToLocation] = useState<Location | null>(null);
  const [selectedMode, setSelectedMode] = useState<RouteSegment['mode']>('flight');
  
  const createRoute = trpc.routes.create.useMutation({
    onSuccess: (data) => {
      console.log('Route created:', data);
      router.push(`/routes/${data.id}`);
    },
    onError: (error) => {
      console.error('Error creating route:', error);
    },
  });

  const addSegment = () => {
    if (fromLocation && toLocation) {
      setSegments([...segments, {
        from: fromLocation,
        to: toLocation,
        mode: selectedMode,
      }]);
      setFromLocation(null);
      setToLocation(null);
      setIsAddingSegment(false);
    }
  };

  const removeSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const handleSaveRoute = () => {
    if (isMultStyle) {
      if (!routeName || segments.length === 0) {
        alert('Please add a route name and at least one segment');
        return;
      }

      // Convert segments to waypoints
      const waypoints: Array<{ lat: number; lng: number; name?: string }> = [];
      
      segments.forEach((segment, index) => {
        if (index === 0) {
          waypoints.push({
            lat: segment.from.coordinates[1],
            lng: segment.from.coordinates[0],
            name: segment.from.name,
          });
        }
        waypoints.push({
          lat: segment.to.coordinates[1],
          lng: segment.to.coordinates[0],
          name: segment.to.name,
        });
      });

      createRoute.mutate({
        name: routeName,
        description: description || undefined,
        waypoints,
      });
    } else {
      // Original save logic
      if (!routeName || waypoints.length < 2) {
        alert('Please enter a route name and add at least 2 waypoints');
        return;
      }

      createRoute.mutate({
        name: routeName,
        description: description || undefined,
        waypoints: waypoints.map((wp, index) => ({
          ...wp,
          name: wp.name || `Waypoint ${index + 1}`,
        })),
      });
    }
  };

  // Mult.dev style UI
  if (isMultStyle) {
    return (
      <div className="flex h-screen bg-gray-900">
        {/* Sidebar */}
        <div className="w-96 bg-gray-800 text-white overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsMultStyle(false)}
                  className="p-2 hover:bg-gray-700 rounded"
                  title="Switch to classic view"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                </button>
                <h2 className="font-semibold">Route</h2>
              </div>
              <button className="p-2 hover:bg-gray-700 rounded">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Route Name */}
            <input
              type="text"
              placeholder="Route name..."
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              className="w-full bg-gray-700 px-3 py-2 rounded text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Photos Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Photos</span>
              <button
                onClick={() => setShowPhotos(!showPhotos)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showPhotos ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showPhotos ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Route Segments */}
          <div className="p-6">
            {segments.map((segment, index) => (
              <div key={index} className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  {segment.mode === 'flight' && <Plane className="w-5 h-5 text-gray-400" />}
                  {segment.mode === 'drive' && <Car className="w-5 h-5 text-gray-400" />}
                  {segment.mode === 'train' && <Train className="w-5 h-5 text-gray-400" />}
                  {segment.mode === 'walk' && <PersonStanding className="w-5 h-5 text-gray-400" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{segment.from.name}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSegment(index)}
                    className="p-1 hover:bg-gray-700 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-2 ml-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{segment.to.name}</span>
                    </div>
                  </div>
                </div>
                {index < segments.length - 1 && (
                  <div className="border-l-2 border-gray-700 ml-2.5 h-4"></div>
                )}
              </div>
            ))}

            {/* Add Segment Form */}
            {isAddingSegment ? (
              <div className="bg-gray-700 rounded-lg p-4">
                <LocationSearch
                  placeholder="From location..."
                  value={fromLocation}
                  onChange={setFromLocation}
                  className="mb-3"
                />
                
                <LocationSearch
                  placeholder="To location..."
                  value={toLocation}
                  onChange={setToLocation}
                  className="mb-3"
                />

                <div className="flex gap-2 mb-3">
                  {transportModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id as RouteSegment['mode'])}
                      className={`flex-1 p-2 rounded flex items-center justify-center gap-2 transition-colors ${
                        selectedMode === mode.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                      title={mode.label}
                    >
                      <mode.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addSegment}
                    disabled={!fromLocation || !toLocation}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingSegment(false);
                      setFromLocation(null);
                      setToLocation(null);
                    }}
                    className="flex-1 px-3 py-2 bg-gray-600 text-white rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingSegment(true)}
                className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Add location
              </button>
            )}
          </div>

          {/* Save Button */}
          <div className="p-6 border-t border-gray-700">
            <Button
              onClick={handleSaveRoute}
              disabled={!routeName || segments.length === 0 || createRoute.isPending}
              className="w-full"
            >
              {createRoute.isPending ? 'Saving...' : 'Save Route'}
            </Button>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1">
          <Map segments={segments} darkMode={true} />
        </div>
      </div>
    );
  }

  // Original UI (fallback)
  return (
    <div className="flex h-screen">
      {/* Original sidebar code... */}
      <div className="w-96 bg-gray-50 p-6 overflow-y-auto">
        <button 
          onClick={() => setIsMultStyle(true)}
          className="mb-4 text-sm text-blue-600 hover:underline"
        >
          Switch to Mult.dev style →
        </button>
        
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

// Location Search Component
function LocationSearch({
  placeholder,
  value,
  onChange,
  className = '',
}: {
  placeholder: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  className?: string;
}) {
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Location[]>([]);

  const searchLocation = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=5`
      );
      const data = await response.json();
      
      const locations: Location[] = data.features.map((feature: any) => ({
        id: feature.id,
        name: feature.place_name,
        coordinates: feature.center,
        address: feature.place_name,
      }));
      
      setResults(locations);
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchLocation(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, searchLocation]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={value ? value.name : search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-600 pl-10 pr-3 py-2 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-white rounded-full"></div>
          </div>
        )}
      </div>
      
      {results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((location) => (
            <button
              key={location.id}
              onClick={() => {
                onChange(location);
                setSearch('');
                setResults([]);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-600 text-sm text-white"
            >
              {location.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}