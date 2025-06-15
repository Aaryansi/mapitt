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

// Vehicle icons as SVG strings with glow
const vehicleIcons = {
  flight: `<svg width="48" height="48" viewBox="0 0 24 24" fill="white" stroke="none">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>`,
  drive: `<svg width="36" height="36" viewBox="0 0 24 24" fill="white" stroke="none">
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
  </svg>`,
  train: `<svg width="36" height="36" viewBox="0 0 24 24" fill="white" stroke="none">
    <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>`,
  walk: `<svg width="36" height="36" viewBox="0 0 24 24" fill="white" stroke="none">
    <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
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

  // Create 3D curved path for flights
  const create3DCurvedPath = (start: [number, number], end: [number, number]): Array<[number, number, number]> => {
    const points: Array<[number, number, number]> = [];
    const steps = 200;
    
    const distance = Math.sqrt(
      Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
    );
    
    // Calculate max altitude based on distance (in meters)
    const maxAltitude = Math.min(distance * 80000, 800000); // Max 800km altitude for better globe visibility
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      const midLng = (start[0] + end[0]) / 2;
      const midLat = (start[1] + end[1]) / 2;
      
      // Add more curvature for longer distances
      const curvature = Math.min(distance * 0.2, 20);
      const controlLat = midLat + curvature;
      
      // Quadratic bezier curve for position
      const lng = Math.pow(1 - t, 2) * start[0] + 
                  2 * (1 - t) * t * midLng + 
                  Math.pow(t, 2) * end[0];
      
      const lat = Math.pow(1 - t, 2) * start[1] + 
                  2 * (1 - t) * t * controlLat + 
                  Math.pow(t, 2) * end[1];
      
      // Parabolic altitude curve
      const altitude = maxAltitude * 4 * t * (1 - t);
      
      points.push([lng, lat, altitude]);
    }
    
    return points;
  };

  // Get ground route from Mapbox
  const getGroundRoute = async (start: [number, number], end: [number, number], mode: string): Promise<Array<[number, number, number]>> => {
    try {
      const profile = mode === 'drive' ? 'driving' : mode === 'train' ? 'driving' : 'walking';
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        // Add slight elevation for ground routes
        const elevation = mode === 'train' ? 50 : mode === 'drive' ? 30 : 20;
        return data.routes[0].geometry.coordinates.map((coord: number[]) => 
          [coord[0], coord[1], elevation] as [number, number, number]
        );
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
    return [[start[0], start[1], 20], [end[0], end[1], 20]];
  };

  // Build path based on transport mode
  const buildPath = async (
    from: [number, number],
    to: [number, number],
    mode: string
  ): Promise<Array<[number, number, number]>> => {
    if (mode === 'flight') {
      return create3DCurvedPath(from, to);
    } else {
      return await getGroundRoute(from, to, mode);
    }
  };

  // Create vehicle marker with glow effect
  const createVehicleMarker = (mode: keyof typeof vehicleIcons) => {
    const container = document.createElement('div');
    container.style.width = mode === 'flight' ? '48px' : '36px';
    container.style.height = mode === 'flight' ? '48px' : '36px';
    container.style.position = 'relative';
    
    // Add glow effect
    const glow = document.createElement('div');
    glow.style.position = 'absolute';
    glow.style.width = '100%';
    glow.style.height = '100%';
    glow.style.background = mode === 'flight' ? 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)' :
                           mode === 'drive' ? 'radial-gradient(circle, rgba(16,185,129,0.6) 0%, transparent 70%)' :
                           mode === 'train' ? 'radial-gradient(circle, rgba(245,158,11,0.6) 0%, transparent 70%)' :
                           'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)';
    glow.style.filter = 'blur(8px)';
    glow.style.transform = 'scale(1.5)';
    container.appendChild(glow);
    
    // Add icon
    const icon = document.createElement('div');
    icon.innerHTML = vehicleIcons[mode];
    icon.style.position = 'absolute';
    icon.style.width = '100%';
    icon.style.height = '100%';
    icon.style.display = 'flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))';
    container.appendChild(icon);
    
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = '100';
    
    return container;
  };

  // Calculate bearing between two points
  const calculateBearing = (start: [number, number], end: [number, number]): number => {
    const startLat = start[1] * Math.PI / 180;
    const startLng = start[0] * Math.PI / 180;
    const endLat = end[1] * Math.PI / 180;
    const endLng = end[0] * Math.PI / 180;

    const dLng = endLng - startLng;
    const y = Math.sin(dLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
    
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  // Smooth interpolation between points
  const interpolatePosition = (p1: [number, number, number], p2: [number, number, number], t: number): [number, number, number] => {
    return [
      p1[0] + (p2[0] - p1[0]) * t,
      p1[1] + (p2[1] - p1[1]) * t,
      p1[2] + (p2[2] - p1[2]) * t
    ];
  };

  // Animate route with original camera behavior
  const animateRoute = useCallback(
    async (segIndex = 0) => {
      if (!mapRef.current || !segments || segIndex >= segments.length) {
        setIsAnimating(false);
        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.remove();
          vehicleMarkerRef.current = null;
        }
        onTraceComplete?.();
        return;
      }

      setIsAnimating(true);
      setCurrentSegment(segIndex);

      const seg = segments[segIndex];
      const path = await buildPath(seg.from.coordinates, seg.to.coordinates, seg.mode);

      // Calculate route stats
      const distance = calculateDistance(seg.from.coordinates, seg.to.coordinates);
      const duration = calculateDuration(distance, seg.mode);
      totalProgressRef.current.distance += distance;
      totalProgressRef.current.duration += duration;
      
      setRouteProgress({
        mode: seg.mode,
        distance: Math.round(distance),
        duration,
        progress: ((segIndex + 1) / segments.length) * 100,
        from: seg.from.name.split(',')[0],
        to: seg.to.name.split(',')[0]
      });

      // Create source for 3D line
      const srcId = `live-route`;
      if (mapRef.current.getSource(srcId)) {
        // Remove layers first, then source
        if (mapRef.current.getLayer('live-route-shadow')) {
          mapRef.current.removeLayer('live-route-shadow');
        }
        if (mapRef.current.getLayer(srcId)) {
          mapRef.current.removeLayer(srcId);
        }
        mapRef.current.removeSource(srcId);
      }
      
      mapRef.current.addSource(srcId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        },
        lineMetrics: true
      });

      // Add shadow layer
      mapRef.current.addLayer({
        id: 'live-route-shadow',
        type: 'line',
        source: srcId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#000000',
          'line-width': 6,
          'line-opacity': 0.1,
          'line-blur': 3
        },
      });

      // Add main 3D line
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
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            5, 3,
            10, 6,
            15, 8
          ],
          'line-opacity': 0.9,
          'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0, seg.mode === 'flight' ? '#60a5fa' : '#34d399',
            1, seg.mode === 'flight' ? '#2563eb' : '#059669'
          ]
        },
      });

      // Place the vehicle marker
      if (vehicleMarkerRef.current) vehicleMarkerRef.current.remove();
      const el = createVehicleMarker(seg.mode as keyof typeof vehicleIcons);
      const marker = new mapboxgl.Marker({ 
        element: el, 
        rotationAlignment: 'map',
        pitchAlignment: seg.mode === 'flight' ? 'map' : 'viewport'
      })
        .setLngLat([path[0][0], path[0][1]])
        .addTo(mapRef.current);
      vehicleMarkerRef.current = marker;

      // Fit camera to segment bounds (original behavior)
      const bounds = new mapboxgl.LngLatBounds();
      path.forEach((pt) => {
        if (Array.isArray(pt) && pt.length >= 2) bounds.extend([pt[0], pt[1]]);
      });
      
      mapRef.current.fitBounds(bounds, { 
        padding: 80, 
        duration: 1000, 
        pitch: seg.mode === 'flight' ? 60 : 45,
        bearing: 0
      });

      // Wait for camera to settle
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Animate with smooth interpolation
      let currentPathIndex = 0;
      let interpolationProgress = 0;
      const drawnPath: Array<[number, number, number]> = [path[0]];
      
      // Animation settings
      const fps = 60;
      const frameTime = 1000 / fps;
      const animationDuration = seg.mode === 'flight' ? 8000 : 6000;
      const totalFrames = animationDuration / frameTime;
      const progressPerFrame = (path.length - 1) / totalFrames;
      
      let lastFrameTime = performance.now();

      const animateStep = (currentTime: number) => {
        const deltaTime = currentTime - lastFrameTime;
        
        if (deltaTime >= frameTime) {
          lastFrameTime = currentTime - (deltaTime % frameTime);
          
          // Update progress
          interpolationProgress += progressPerFrame;
          
          if (interpolationProgress >= path.length - 1) {
            // Complete the path
            const src = mapRef.current!.getSource(srcId) as mapboxgl.GeoJSONSource;
            src.setData({ 
              type: 'Feature', 
              properties: {}, 
              geometry: { type: 'LineString', coordinates: path } 
            });
            
            // Pause, then next segment
            setTimeout(() => animateRoute(segIndex + 1), 500);
            return;
          }

          // Calculate interpolated position
          currentPathIndex = Math.floor(interpolationProgress);
          const t = interpolationProgress - currentPathIndex;
          
          const currentPos = interpolatePosition(
            path[currentPathIndex],
            path[Math.min(currentPathIndex + 1, path.length - 1)],
            t
          );

          // Add to drawn path
          drawnPath.push(currentPos);
          
          // Update line
          const src = mapRef.current!.getSource(srcId) as mapboxgl.GeoJSONSource;
          src.setData({ 
            type: 'Feature', 
            properties: {}, 
            geometry: { type: 'LineString', coordinates: drawnPath } 
          });

          // Update vehicle position
          if (vehicleMarkerRef.current) {
            vehicleMarkerRef.current.setLngLat([currentPos[0], currentPos[1]]);
            
            // Calculate rotation for all vehicles
            if (currentPathIndex < path.length - 1) {
              const nextIndex = Math.min(currentPathIndex + 1, path.length - 1);
              const bearing = calculateBearing(
                [path[currentPathIndex][0], path[currentPathIndex][1]],
                [path[nextIndex][0], path[nextIndex][1]]
              );
              vehicleMarkerRef.current.setRotation(bearing);
            }
          }

          // Camera follow (original behavior from your file)
          const currentCenter = mapRef.current!.getCenter();
          const targetCenter = [currentPos[0], currentPos[1]] as [number, number];
          const distance = Math.sqrt(
            Math.pow(targetCenter[0] - currentCenter.lng, 2) + 
            Math.pow(targetCenter[1] - currentCenter.lat, 2)
          );
          
          if (distance > 0.001) {
            mapRef.current!.easeTo({
              center: targetCenter,
              duration: 100,
              easing: (t) => t
            });
          }
        }

        animationRef.current = requestAnimationFrame(animateStep);
      };

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

  // Map init (keep all the original 3D settings)
  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: darkMode ? 'mapbox://styles/mapbox/navigation-night-v1' : 'mapbox://styles/mapbox/navigation-day-v1',
      center: [0, 0],
      zoom: 1.5,
      pitch: 0,
      bearing: 0,
      antialias: true,
      projection: 'globe'
    });
    mapRef.current = map;
    
    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl({
      visualizePitch: true
    }), 'top-right');
    
    // Add scale control
    map.addControl(new mapboxgl.ScaleControl({
      maxWidth: 80,
      unit: 'metric'
    }), 'bottom-right');
    
    map.on('load', () => {
      // Configure globe settings
      map.setProjection('globe');
      map.setPaintProperty('globe', 'globe-atmosphere-color', darkMode ? 'rgba(85, 150, 225, 0.5)' : 'rgba(85, 150, 225, 0.3)');
      map.setPaintProperty('globe', 'globe-atmosphere-thickness', 2);
      
      // 1. 3D Terrain DEM
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // 2. Sky & Fog (optimized for globe projection)
      map.setFog({
        'range': [0.5, 10],
        'horizon-blend': 0.05,
        'color': darkMode ? 'rgb(17,24,39)' : 'rgb(186,210,235)',
        'high-color': darkMode ? 'rgb(36,92,223)' : 'rgb(36,92,223)',
        'space-color': darkMode ? 'rgb(10,10,25)' : 'rgb(220,159,159)',
        'star-intensity': darkMode ? 0.5 : 0.15
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

  // Update map when segments change (only markers, no lines)
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

    // Fit bounds to show all markers
    const bounds = new mapboxgl.LngLatBounds();
    segments.forEach(s => {
      bounds.extend(s.from.coordinates);
      bounds.extend(s.to.coordinates);
    });
    mapRef.current!.fitBounds(bounds, { padding: 150 });
  }, [segments]);

  useEffect(() => {
    updateMapWithSegments();
  }, [segments, updateMapWithSegments]);

  // Animation button
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
        // Clear existing routes
        if (mapRef.current?.getLayer('live-route-shadow')) {
          mapRef.current.removeLayer('live-route-shadow');
        }
        if (mapRef.current?.getLayer('live-route')) {
          mapRef.current.removeLayer('live-route');
        }
        if (mapRef.current?.getSource('live-route')) {
          mapRef.current.removeSource('live-route');
        }

        // Reset progress
        totalProgressRef.current = { distance: 0, duration: 0 };
        setRouteProgress(null);

        // Start animation
        button.innerHTML = '⏸ Pause';
        setIsAnimating(true);
        animateRoute(0);
      } else {
        // Stop animation
        button.innerHTML = '▶ Play Route Animation';
        setIsAnimating(false);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }
    };

    const container = mapRef.current.getContainer();
    container.appendChild(button);

    return () => {
      if (container.contains(button)) {
        container.removeChild(button);
      }
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