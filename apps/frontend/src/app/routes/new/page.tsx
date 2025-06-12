// File: apps/frontend/src/app/routes/new/page.tsx

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Map } from '@/components/Map/Map';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import { Search, Plane, Car, Train, PersonStanding, Trash2, MoreVertical, Sun, Moon } from 'lucide-react';

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
  const [routeName, setRouteName] = useState('');
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  
  // For the new segment being added
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [toLocation, setToLocation] = useState<Location | null>(null);
  const [selectedMode, setSelectedMode] = useState<RouteSegment['mode']>('flight');
  
  const [traceRequested, setTraceRequested] = useState(false);

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
      const newSegment = {
        from: fromLocation,
        to: toLocation,
        mode: selectedMode,
      };
      
      setSegments([...segments, newSegment]);
      
      // Set the "to" location as the "from" for the next segment
      setFromLocation(toLocation);
      setToLocation(null);
      setSelectedMode('flight'); // Reset to default mode
    }
  };

  const removeSegment = (index: number) => {
    const newSegments = segments.filter((_, i) => i !== index);
    setSegments(newSegments);
    
    // If removing the last segment, update the from location
    if (index === segments.length - 1 && newSegments.length > 0) {
      setFromLocation(newSegments[newSegments.length - 1].to);
    } else if (newSegments.length === 0) {
      setFromLocation(null);
    }
  };

  const handleSaveRoute = () => {
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
      waypoints,
    });
  };

  // Start with add segment form open if no segments
  useEffect(() => {
    if (segments.length === 0 && !isAddingSegment) {
      setIsAddingSegment(true);
    }
  }, [segments.length, isAddingSegment]);

  // reset traceRequested if user edits
  useEffect(() => {
    if (segments.length > 0 && traceRequested) {
      setTraceRequested(false);
    }
  }, [segments, traceRequested]);

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Sidebar */}
      <div className={`w-96 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} overflow-y-auto shadow-xl`}>
        {/* Live Trace Button (new) */}
        <div className="p-6 border-b">
          <button
            onClick={() => setTraceRequested(true)}
            disabled={segments.length === 0}
            className="w-full mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Trace Route
          </button>
        </div>

        {/* Header */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 grid grid-cols-2 gap-0.5">
                <div className={`w-3 h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-400'} rounded-sm`}></div>
                <div className={`w-3 h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-400'} rounded-sm`}></div>
                <div className={`w-3 h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-400'} rounded-sm`}></div>
                <div className={`w-3 h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-400'} rounded-sm`}></div>
              </div>
              <h2 className="font-semibold text-lg">Route</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                title="Toggle theme"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button className={`p-2 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Route Name */}
          <input
            type="text"
            placeholder="Route name..."
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className={`w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode 
                ? 'bg-gray-700 text-white placeholder-gray-400' 
                : 'bg-gray-100 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>

        {/* Route Segments */}
        <div className="p-6">
          {segments.map((segment, index) => (
            <div key={index} className="mb-6 relative">
              {/* From Location */}
              {index === 0 && (
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-green-500' : 'bg-green-600'}`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{segment.from.name}</p>
                  </div>
                </div>
              )}
              
              {/* Transport Mode Line */}
              <div className="flex items-center gap-3 mb-3 ml-1.5">
                <div className={`w-0.5 h-12 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  {segment.mode === 'flight' && <Plane className="w-3 h-3" />}
                  {segment.mode === 'drive' && <Car className="w-3 h-3" />}
                  {segment.mode === 'train' && <Train className="w-3 h-3" />}
                  {segment.mode === 'walk' && <PersonStanding className="w-3 h-3" />}
                  <span className="capitalize">{segment.mode}</span>
                </div>
                <button
                  onClick={() => removeSegment(index)}
                  className={`ml-auto p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              {/* To Location */}
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  index === segments.length - 1 
                    ? darkMode ? 'bg-red-500' : 'bg-red-600'
                    : darkMode ? 'bg-blue-500' : 'bg-blue-600'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{segment.to.name}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Add Segment Form */}
          {isAddingSegment && (
            <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {!fromLocation || segments.length === 0 ? (
                <LocationSearch
                  placeholder="From location..."
                  value={fromLocation}
                  onChange={setFromLocation}
                  darkMode={darkMode}
                  className="mb-3"
                />
              ) : (
                <div className="mb-3 p-3 rounded bg-opacity-50 backdrop-blur">
                  <p className="text-xs opacity-70 mb-1">From</p>
                  <p className="text-sm font-medium">{fromLocation.name}</p>
                </div>
              )}
              
              <LocationSearch
                placeholder="To location..."
                value={toLocation}
                onChange={setToLocation}
                darkMode={darkMode}
                className="mb-3"
              />

              {fromLocation && toLocation && (
                <>
                  <div className="flex gap-2 mb-3">
                    {transportModes.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id as RouteSegment['mode'])}
                        className={`flex-1 p-2 rounded flex items-center justify-center gap-2 transition-colors ${
                          selectedMode === mode.id
                            ? 'bg-blue-600 text-white'
                            : darkMode 
                              ? 'bg-gray-600 hover:bg-gray-500 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
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
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingSegment(false);
                        setToLocation(null);
                      }}
                      className={`flex-1 px-3 py-2 rounded transition-colors ${
                        darkMode 
                          ? 'bg-gray-600 text-white hover:bg-gray-500'
                          : 'bg-gray-300 text-gray-900 hover:bg-gray-400'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Add Another Location Button */}
          {!isAddingSegment && segments.length > 0 && (
            <button
              onClick={() => setIsAddingSegment(true)}
              className={`w-full px-4 py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              <span className="text-lg">+</span>
              Add another location
            </button>
          )}
        </div>

        {/* Save Button */}
        <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={handleSaveRoute}
            disabled={!routeName || segments.length === 0 || createRoute.isPending}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
              !routeName || segments.length === 0 || createRoute.isPending
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {createRoute.isPending ? 'Saving...' : 'Save Route'}
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <Map
          segments={segments}
          darkMode={darkMode}
          traceRequested={traceRequested}
          onTraceComplete={() => setTraceRequested(false)}
        />
      </div>
    </div>
  );
}

// Location Search Component
function LocationSearch({
  placeholder,
  value,
  onChange,
  darkMode,
  className = '',
}: {
  placeholder: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  darkMode: boolean;
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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 opacity-50" />
        <input
          type="text"
          placeholder={placeholder}
          value={value ? value.name : search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full pl-10 pr-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            darkMode 
              ? 'bg-gray-600 text-white placeholder-gray-400'
              : 'bg-white text-gray-900 placeholder-gray-500 border border-gray-300'
          }`}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className={`animate-spin h-4 w-4 border-2 rounded-full ${
              darkMode 
                ? 'border-gray-400 border-t-white'
                : 'border-gray-300 border-t-gray-600'
            }`}></div>
          </div>
        )}
      </div>
      
      {results.length > 0 && (
        <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto ${
          darkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'
        }`}>
          {results.map((location) => (
            <button
              key={location.id}
              onClick={() => {
                onChange(location);
                setSearch('');
                setResults([]);
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-600'
                  : 'hover:bg-gray-100'
              }`}
            >
              {location.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}