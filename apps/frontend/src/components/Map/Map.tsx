'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// You'll need to get a Mapbox token from https://mapbox.com
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapProps {
  onRouteChange?: (waypoints: Array<{ lat: number; lng: number }>) => void;
}

export function Map({ onRouteChange }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [waypoints, setWaypoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-122.4194, 37.7749], // San Francisco
      zoom: 12,
    });

    // Add click handler to add waypoints
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      
      // Create a marker
      const marker = new mapboxgl.Marker()
        .setLngLat([lng, lat])
        .addTo(map.current!);
      
      markers.current.push(marker);
      
      const newWaypoints = [...waypoints, { lat, lng }];
      setWaypoints(newWaypoints);
      onRouteChange?.(newWaypoints);
      
      // Draw line if we have at least 2 points
      if (newWaypoints.length >= 2) {
        drawRoute(newWaypoints);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  const drawRoute = (points: Array<{ lat: number; lng: number }>) => {
    if (!map.current) return;

    const coordinates = points.map(p => [p.lng, p.lat]);

    // Remove existing route layer if it exists
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }

    // Add the route
    map.current.addSource('route', {
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

    map.current.addLayer({
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
  };

  const clearRoute = () => {
    // Clear all markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
    
    // Clear waypoints
    setWaypoints([]);
    onRouteChange?.([]);
    
    // Remove route layer
    if (map.current?.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Map Controls */}
      <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-md">
        <h3 className="font-semibold mb-2">Route Builder</h3>
        <p className="text-sm text-gray-600 mb-3">
          Click on the map to add waypoints
        </p>
        <p className="text-sm mb-3">
          Waypoints: {waypoints.length}
        </p>
        <button
          onClick={clearRoute}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear Route
        </button>
      </div>
    </div>
  );
}