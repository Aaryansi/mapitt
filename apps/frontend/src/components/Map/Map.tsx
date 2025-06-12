// File: apps/frontend/src/components/Map/Map.tsx

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
  segments?: Array<{
    from: Location;
    to: Location;
    mode: 'flight' | 'drive' | 'train' | 'walk';
  }>;
  darkMode?: boolean;
  traceRequested?: boolean;
  onTraceComplete?: () => void;
}

interface RouteProgress {
  mode: string;
  distance: number;
  duration: number;
  progress: number;
  from: string;
  to: string;
}

// Vehicle icons as SVG strings
const vehicleIcons = {
  flight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M2 22l20-20M2 2l20 20M12 2l0 20M2 12l20 0"/>
  </svg>`,
  drive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 17h18M3 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M3 17v-4m18 4v-4M7 17v-4m10 4v-4M7 17h10"/>
  </svg>`,
  train: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 15h16M4 15a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M4 15v4m16-4v4M8 15v4m8-4v4"/>
  </svg>`,
  walk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-8-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm16 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
  </svg>`
};

export function Map({ segments, darkMode = false, traceRequested = false, onTraceComplete }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const vehicleMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<number>(0);
  const [routeProgress, setRouteProgress] = useState<RouteProgress | null>(null);
  const totalProgressRef = useRef({ distance: 0, duration: 0 });

  // Precomputed paths for each segment
  const [paths, setPaths] = useState<number[][][]>([]);

  // Calculate distance between two points in kilometers
  const calculateDistance = (start: [number, number], end: [number, number]): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (end[1] - start[1]) * Math.PI / 180;
    const dLon = (end[0] - start[0]) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(start[1] * Math.PI / 180) * Math.cos(end[1] * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Calculate duration based on mode and distance
  const calculateDuration = (distance: number, mode: string): number => {
    const speeds = {
      flight: 800, // km/h
      drive: 80,   // km/h
      train: 120,  // km/h
      walk: 5      // km/h
    };
    return (distance / speeds[mode as keyof typeof speeds]) * 60; // in minutes
  };

  // Format duration in hours and minutes
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Create curved path for flights
  const createCurvedPath = (start: [number, number], end: [number, number]): number[][] => {
    const points: number[][] = [];
    const steps = 200;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      const midLng = (start[0] + end[0]) / 2;
      const midLat = (start[1] + end[1]) / 2;
      
      const distance = Math.sqrt(
        Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
      );
      const curvature = Math.min(distance * 0.2, 20);
      
      const controlLat = midLat + curvature;
      
      const lng = Math.pow(1 - t, 2) * start[0] + 
                  2 * (1 - t) * t * midLng + 
                  Math.pow(t, 2) * end[0];
      
      const lat = Math.pow(1 - t, 2) * start[1] + 
                  2 * (1 - t) * t * controlLat + 
                  Math.pow(t, 2) * end[1];
      
      points.push([lng, lat]);
    }
    
    return points;
  };

  // Get route for ground transport
  const getGroundRoute = async (start: [number, number], end: [number, number], mode: string): Promise<number[][]> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${mode}/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();
      return data.routes[0].geometry.coordinates;
    } catch (error) {
      console.error('Error fetching route:', error);
      return [start, end];
    }
  };

  // Create vehicle marker element with 3D effect
  const createVehicleMarker = (mode: string) => {
    const el = document.createElement('div');
    el.className = 'vehicle-marker';
    el.innerHTML = vehicleIcons[mode as keyof typeof vehicleIcons];
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.color = mode === 'flight' ? '#3b82f6' : 
                     mode === 'drive' ? '#10b981' :
                     mode === 'train' ? '#f59e0b' : '#8b5cf6';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.transition = 'transform 0.1s ease-out';
    el.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))';
    el.style.perspective = '1000px';
    el.style.transformStyle = 'preserve-3d';
    return el;
  };

  // Calculate bearing between two points
  const calculateBearing = (start: [number, number], end: [number, number]): number => {
    const startLng = start[0] * Math.PI / 180;
    const startLat = start[1] * Math.PI / 180;
    const endLng = end[0] * Math.PI / 180;
    const endLat = end[1] * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  // Helper: build straight or curved path
  const buildPath = async (
    from: [number, number],
    to: [number, number],
    mode: string
  ): Promise<number[][]> => {
    if (mode === 'flight') {
      // curved Bézier
      const pts: number[][] = [];
      const steps = 200;
      const midLng = (from[0] + to[0]) / 2;
      const midLat = (from[1] + to[1]) / 2 + 5; // slight curvature
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lng = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * midLng + t * t * to[0];
        const lat = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * midLat + t * t * to[1];
        pts.push([lng, lat]);
      }
      return pts;
    } else {
      // fetch real ground route
      const profile = mode === 'drive' ? 'driving' : mode === 'train' ? 'driving' : 'walking';
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const json = await res.json();
      return json.routes[0].geometry.coordinates;
    }
  };

  // The one‐and‐only animateRoute: fetch/build this segment's path,
  // then incrementally add points to a live line source & move the vehicle.
  const animateRoute = useCallback(
    async (segIndex = 0) => {
      if (!mapRef.current || !segments || segIndex >= segments.length) {
        setIsAnimating(false);
        onTraceComplete?.();
        return;
      }
      setIsAnimating(true);
      setCurrentSegment(segIndex);

      const seg = segments[segIndex];
      const path = await buildPath(seg.from.coordinates, seg.to.coordinates, seg.mode);

      // Create or reset the GeoJSON source for this segment
      const srcId = `live-route`;
      if (mapRef.current.getSource(srcId)) {
        mapRef.current.removeLayer(srcId);
        mapRef.current.removeSource(srcId);
      }
      mapRef.current.addSource(srcId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        },
      });
      mapRef.current.addLayer({
        id: srcId,
        type: 'line',
        source: srcId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color':
            seg.mode === 'flight'
              ? '#3b82f6'
              : seg.mode === 'drive'
              ? '#10b981'
              : seg.mode === 'train'
              ? '#f59e0b'
              : '#8b5cf6',
          'line-width': 4,
        },
      });

      // Place the vehicle marker
      if (vehicleMarkerRef.current) vehicleMarkerRef.current.remove();
      const el = document.createElement('div');
      el.innerHTML = vehicleIcons[seg.mode];
      el.style.width = '32px';
      el.style.height = '32px';
      if (Array.isArray(path[0]) && path[0].length === 2) {
        const marker = new mapboxgl.Marker({ element: el, rotationAlignment: 'map' })
          .setLngLat([path[0][0], path[0][1]])
          .addTo(mapRef.current);
        vehicleMarkerRef.current = marker;
      }

      // Animate: gradually extend the line and move the marker
      let step = 0;
      const total = path.length;
      const animateStep = () => {
        if (step >= total) {
          // pause, then next segment
          setTimeout(() => animateRoute(segIndex + 1), 500);
          return;
        }
        const coordsSoFar = path.slice(0, step + 1);
        const src = mapRef.current!.getSource(srcId) as mapboxgl.GeoJSONSource;
        src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coordsSoFar } });
        if (vehicleMarkerRef.current && Array.isArray(path[step]) && path[step].length === 2) {
          vehicleMarkerRef.current.setLngLat([path[step][0], path[step][1]]);
        }
        step++;
        animationRef.current = requestAnimationFrame(animateStep);
      };

      // Fit camera to full segment
      const bounds = new mapboxgl.LngLatBounds();
      path.forEach((pt) => {
        if (Array.isArray(pt) && pt.length === 2) bounds.extend([pt[0], pt[1]]);
      });
      if (path.length > 0) {
        mapRef.current.fitBounds(bounds, { padding: 50, duration: 1000, pitch: seg.mode === 'flight' ? 60 : 45 });
      }

      // kick off
      animationRef.current = requestAnimationFrame(animateStep);
    },
    [segments, onTraceComplete]
  );

  // On traceRequested → start at segment 0
  useEffect(() => {
    if (traceRequested) {
      animateRoute(0);
    }
  }, [traceRequested, animateRoute]);

  // Map init (unchanged, but keep 3D, terrain, fog, etc.)
  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: darkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 2,
      pitch: 45,
      bearing: 0,
      antialias: true,
    });
    mapRef.current = map;
    map.on('load', () => {
      // 1. 3D Terrain DEM
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // 2. Sky & Fog
      map.setFog({
        'horizon-blend': 0.1,
        color: darkMode ? 'rgb(17,24,39)' : 'rgb(243,244,246)',
        'space-color': darkMode ? 'rgb(10,10,25)' : 'rgb(255,255,255)',
        'star-intensity': 0.3
      });

      // 3. 3D Buildings
      map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': darkMode ? '#444' : '#aaa',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.6
        }
      });

      // Add markers and draw routes when segments change
      if (segments && segments.length > 0) {
        updateMapWithSegments();
      }
    });
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      map.remove();
    };
  }, [darkMode]);

  // Build actual coordinate arrays (curved for flight, fetched for ground)
  useEffect(() => {
    if (!segments) {
      setPaths([]);
      return;
    }
    Promise.all(
      segments.map(async (seg) => {
        if (seg.mode === 'flight') {
          return createCurvedPath(seg.from.coordinates, seg.to.coordinates);
        } else {
          const profile = seg.mode === 'drive' ? 'driving' : seg.mode;
          try {
            const res = await fetch(
              `https://api.mapbox.com/directions/v5/mapbox/${profile}/${seg.from.coordinates.join(',')};${seg.to.coordinates.join(',')}?geometries=geojson&access_token=${mapboxgl.accessToken}`
            );
            const data = await res.json();
            return data.routes[0].geometry.coordinates;
          } catch {
            return [seg.from.coordinates, seg.to.coordinates];
          }
        }
      })
    ).then(setPaths);
  }, [segments]);

  // Modified drawAllSegments to use `paths`
  const drawAllSegments = useCallback(() => {
    if (!mapRef.current || !segments || segments.length === 0 || paths.length < segments.length) return;

    // clear old layers
    segments.forEach((_, i) => {
      const id = `route-${i}`;
      if (mapRef.current!.getLayer(id)) mapRef.current!.removeLayer(id);
      if (mapRef.current!.getSource(id)) mapRef.current!.removeSource(id);
    });

    // draw using precomputed paths
    segments.forEach((segment, i) => {
      const coords = paths[i];
      mapRef.current!.addSource(`route-${i}`, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
      });
      mapRef.current!.addLayer({
        id: `route-${i}`,
        type: 'line',
        source: `route-${i}`,
        layout: { 'line-join': 'round','line-cap': 'round' },
        paint: {
          'line-color':
            segment.mode === 'flight' ? '#3b82f6' :
            segment.mode === 'drive' ? '#10b981' :
            segment.mode === 'train' ? '#f59e0b' : '#8b5cf6',
          'line-width': 3,
          //'line-dasharray': segment.mode === 'flight' ? [0,4,3] : [1,0],
        },
      });
    });

    // fit all
    const bounds = new mapboxgl.LngLatBounds();
    segments.forEach(s => {
      bounds.extend(s.from.coordinates);
      bounds.extend(s.to.coordinates);
    });
    mapRef.current!.fitBounds(bounds, { padding: 100 });
  }, [segments, paths]);

  // Notify page when animation fully completes
  useEffect(() => {
    if (!isAnimating && !currentSegment && traceRequested) {
      onTraceComplete?.();
    }
  }, [isAnimating, currentSegment, traceRequested, onTraceComplete]);

  // Update map when segments change
  const updateMapWithSegments = useCallback(() => {
    if (!mapRef.current || !segments) return;

    // Wait for map to be loaded
    if (!mapRef.current.isStyleLoaded()) {
      mapRef.current.once('load', updateMapWithSegments);
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for all locations
    const allLocations: Location[] = [];
    segments.forEach((segment, index) => {
      if (index === 0 || !allLocations.find(loc => loc.id === segment.from.id)) {
        allLocations.push(segment.from);
      }
      if (!allLocations.find(loc => loc.id === segment.to.id)) {
        allLocations.push(segment.to);
      }
    });

    allLocations.forEach((location, index) => {
      const isStart = index === 0;
      const isEnd = index === allLocations.length - 1;
      
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = isStart ? '#10b981' : isEnd ? '#ef4444' : '#3b82f6';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat(location.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="font-medium">${location.name}</div>`
        ))
        .addTo(mapRef.current!);
      
      markersRef.current.push(marker);
    });

    // Draw all routes
    drawAllSegments();
  }, [segments, drawAllSegments]);

  useEffect(() => {
    updateMapWithSegments();
  }, [segments, updateMapWithSegments]);

  // Add animation button
  useEffect(() => {
    if (!mapRef.current || !segments || segments.length === 0) return;

    const button = document.createElement('button');
    button.innerHTML = '▶ Play Route Animation';
    button.className = `absolute bottom-8 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
      darkMode 
        ? 'bg-gray-800 text-white hover:bg-gray-700' 
        : 'bg-white text-gray-900 hover:bg-gray-100'
    } shadow-lg`;
    button.onclick = () => {
      if (!isAnimating) {
        // Clear existing routes first
        segments.forEach((_, index) => {
          const sourceId = `route-${index}`;
          if (mapRef.current?.getSource(sourceId)) {
            mapRef.current.removeSource(sourceId);
          }
        });

        // Start animation
        setIsAnimating(true);
        animateRoute();
      } else {
        // Stop animation
        setIsAnimating(false);
        button.innerHTML = '▶ Play Route Animation';
      }
    };

    const container = mapRef.current.getContainer();
    container.appendChild(button);

    return () => {
      container.removeChild(button);
    };
  }, [segments, darkMode, isAnimating, animateRoute]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Route Progress Overlay */}
      {routeProgress && (
        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg font-medium text-sm ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        } shadow-lg`}>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="capitalize">{routeProgress.mode}</span>
              <span>•</span>
              <span>{routeProgress.from} → {routeProgress.to}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span>+{routeProgress.distance} km</span>
              <span>•</span>
              <span>+{formatDuration(routeProgress.duration)}</span>
            </div>
            {totalProgressRef.current.distance > 0 && (
              <div className="text-xs mt-1 opacity-75">
                Total: {Math.round(totalProgressRef.current.distance)} km • {formatDuration(totalProgressRef.current.duration)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}