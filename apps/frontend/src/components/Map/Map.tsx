'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface Location {
  id: string;
  name: string;
  coordinates: [number, number];
  address?: string;
}

interface MapProps {
  onRouteChange?: (waypoints: Array<{ lat: number; lng: number; name?: string }>) => void;
  segments?: Array<{
    from: Location;
    to: Location;
    mode: 'flight' | 'drive' | 'train' | 'walk';
  }>;
  darkMode?: boolean;
}

export function Map({ onRouteChange, segments, darkMode = false }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [waypoints, setWaypoints] = useState<Array<{ lat: number; lng: number; name?: string }>>([]);
  const [mapStatus, setMapStatus] = useState('Initializing...');

  // Draw route from segments
  const drawSegmentRoute = useCallback(() => {
    if (!mapRef.current || !segments || segments.length === 0) return;

    if (!mapRef.current.isStyleLoaded()) {
      mapRef.current.once('load', () => {
        drawSegmentRoute();
      });
      return;
    }

    // Clear existing routes
    try {
      if (mapRef.current.getSource('route')) {
        mapRef.current.removeLayer('route');
        mapRef.current.removeSource('route');
      }
    } catch (e) {
      // Source doesn't exist yet
    }

    // Get all coordinates
    const coordinates: [number, number][] = [];
    segments.forEach((segment, index) => {
      if (index === 0) {
        coordinates.push(segment.from.coordinates);
      }
      coordinates.push(segment.to.coordinates);
    });

    // Add route
    mapRef.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates,
        },
      },
    });

    mapRef.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4,
      },
    });

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach(coord => bounds.extend(coord));
    mapRef.current.fitBounds(bounds, { padding: 100 });
  }, [segments]);

  // Draw route from waypoints (existing functionality)
  const drawRoute = useCallback((points: Array<{ lat: number; lng: number }>) => {
    if (!mapRef.current || points.length < 2) return;

    if (!mapRef.current.isStyleLoaded()) {
      mapRef.current.once('load', () => {
        drawRoute(points);
      });
      return;
    }

    const coordinates = points.map(p => [p.lng, p.lat]);

    try {
      if (mapRef.current.getSource('route')) {
        mapRef.current.removeLayer('route');
        mapRef.current.removeSource('route');
      }
    } catch (e) {
      // Source doesn't exist yet
    }

    mapRef.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates,
        },
      },
    });

    mapRef.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4,
      },
    });
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: darkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
      center: segments && segments.length > 0 ? segments[0].from.coordinates : [-122.4194, 37.7749],
      zoom: segments && segments.length > 0 ? 4 : 12,
    });

    mapRef.current = map;

    map.on('load', () => {
      setMapStatus('Ready - Click to add waypoints');
      console.log('Map loaded successfully');
      
      // Draw segments if provided
      if (segments && segments.length > 0) {
        drawSegmentRoute();
      }
    });

    // Only allow clicking if not in segment mode
    if (!segments) {
      map.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        
        const marker = new mapboxgl.Marker()
          .setLngLat([lng, lat])
          .addTo(map);
        
        markersRef.current.push(marker);
        
        setWaypoints(prev => {
          const updated = [...prev, { lat, lng }];
          onRouteChange?.(updated);
          
          if (updated.length >= 2) {
            drawRoute(updated);
          }
          
          return updated;
        });
      });
    }

    map.on('error', (e) => {
      setMapStatus(`Error: ${e.error.message}`);
      console.error('Map error:', e);
    });

    return () => {
      map.remove();
    };
  }, [darkMode, segments, drawSegmentRoute, drawRoute, onRouteChange]);

  // Update map when segments change
  useEffect(() => {
    if (mapRef.current && segments) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add markers for segment locations
      segments.forEach((segment) => {
        const fromMarker = new mapboxgl.Marker({ color: '#10b981' })
          .setLngLat(segment.from.coordinates)
          .setPopup(new mapboxgl.Popup().setHTML(`<p>${segment.from.name}</p>`))
          .addTo(mapRef.current!);
        
        const toMarker = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat(segment.to.coordinates)
          .setPopup(new mapboxgl.Popup().setHTML(`<p>${segment.to.name}</p>`))
          .addTo(mapRef.current!);
        
        markersRef.current.push(fromMarker, toMarker);
      });

      drawSegmentRoute();
    }
  }, [segments, drawSegmentRoute]);

  const clearRoute = () => {
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    setWaypoints([]);
    onRouteChange?.([]);
    
    if (mapRef.current) {
      try {
        if (mapRef.current.getSource('route')) {
          mapRef.current.removeLayer('route');
          mapRef.current.removeSource('route');
        }
      } catch (e) {
        console.log('No route to clear');
      }
    }
  };

  // Don't show controls if in segment mode
  if (segments) {
    return <div ref={mapContainer} className="h-full w-full" />;
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      
      <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-md">
        <h3 className="font-semibold mb-2">Route Builder</h3>
        <p className="text-sm text-gray-600 mb-3">{mapStatus}</p>
        <p className="text-sm mb-3">Waypoints: {waypoints.length}</p>
        {waypoints.length > 0 && (
          <button
            onClick={clearRoute}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Route
          </button>
        )}
      </div>
    </div>
  );
}