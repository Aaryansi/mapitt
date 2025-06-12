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
}

interface RouteProgress {
  mode: string;
  distance: number;
  duration: number;
  progress: number;
  from: string;
  to: string;
}

export function Map({ segments, darkMode = false }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animationRef = useRef<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);
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

  // Animate route drawing
  const animateRoute = useCallback(async (segmentIndex: number = 0) => {
    if (!mapRef.current || !segments || segmentIndex >= segments.length) {
      setIsAnimating(false);
      setCurrentSegment(null);
      setRouteProgress(null);
      return;
    }

    setIsAnimating(true);
    setCurrentSegment(segmentIndex);
    const segment = segments[segmentIndex];
    
    // Calculate total distance and duration for this segment
    const totalDistance = calculateDistance(segment.from.coordinates, segment.to.coordinates);
    const totalDuration = calculateDuration(totalDistance, segment.mode);

    // Get path coordinates based on transport mode
    let pathCoords: number[][];
    if (segment.mode === 'flight') {
      pathCoords = createCurvedPath(segment.from.coordinates, segment.to.coordinates);
    } else {
      pathCoords = await getGroundRoute(segment.from.coordinates, segment.to.coordinates, segment.mode);
    }

    // Create a GeoJSON LineString
    const routeGeoJson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: pathCoords,
      },
    };

    // Add or update the route source
    const sourceId = `route-${segmentIndex}`;
    if (mapRef.current.getSource(sourceId)) {
      (mapRef.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(routeGeoJson);
    } else {
      mapRef.current.addSource(sourceId, {
        type: 'geojson',
        data: routeGeoJson,
      });

      mapRef.current.addLayer({
        id: sourceId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': segment.mode === 'flight' ? '#3b82f6' : 
                        segment.mode === 'drive' ? '#10b981' :
                        segment.mode === 'train' ? '#f59e0b' : '#8b5cf6',
          'line-width': 3,
          'line-dasharray': segment.mode === 'flight' ? [0, 4, 3] : [1, 0],
        },
      });
    }

    // Animate camera along the path
    let currentStep = 0;
    const totalSteps = pathCoords.length - 1;
    const animationDuration = segment.mode === 'flight' ? 8000 : 5000;
    const stepDuration = animationDuration / totalSteps;

    const animate = () => {
      if (currentStep > totalSteps) {
        // Update total progress
        totalProgressRef.current.distance += totalDistance;
        totalProgressRef.current.duration += totalDuration;
        
        // Move to next segment after a pause
        setTimeout(() => animateRoute(segmentIndex + 1), 1000);
        return;
      }

      const progress = currentStep / totalSteps;
      const currentCoord = pathCoords[Math.floor(currentStep)];
      
      // Update route progress
      setRouteProgress({
        mode: segment.mode,
        distance: Math.round(totalDistance * progress),
        duration: Math.round(totalDuration * progress),
        progress: progress * 100,
        from: segment.from.name,
        to: segment.to.name
      });
      
      // Smooth camera movement with easing
      mapRef.current!.easeTo({
        center: currentCoord as [number, number],
        zoom: segment.mode === 'flight' ? 4 : 8,
        bearing: 0,
        duration: stepDuration,
        easing: (t) => t * (2 - t),
      });

      currentStep += 0.5;
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start with a view of the segment
    const bounds = new mapboxgl.LngLatBounds()
      .extend(segment.from.coordinates)
      .extend(segment.to.coordinates);
    
    mapRef.current.fitBounds(bounds, {
      padding: 100,
      duration: 1500,
    });

    // Start animation after initial view
    setTimeout(() => {
      animate();
    }, 1800);
  }, [segments]);

  // Draw all segments at once (no animation)
  const drawAllSegments = useCallback(() => {
    if (!mapRef.current || !segments || segments.length === 0) return;

    // Clear existing routes
    segments.forEach((_, index) => {
      const sourceId = `route-${index}`;
      if (mapRef.current!.getLayer(sourceId)) {
        mapRef.current!.removeLayer(sourceId);
      }
      if (mapRef.current!.getSource(sourceId)) {
        mapRef.current!.removeSource(sourceId);
      }
    });

    // Draw all segments
    segments.forEach((segment, index) => {
      const isFlight = segment.mode === 'flight';
      const pathCoords = isFlight 
        ? createCurvedPath(segment.from.coordinates, segment.to.coordinates)
        : [segment.from.coordinates, segment.to.coordinates];

      mapRef.current!.addSource(`route-${index}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: pathCoords,
          },
        },
      });

      mapRef.current!.addLayer({
        id: `route-${index}`,
        type: 'line',
        source: `route-${index}`,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': segment.mode === 'flight' ? '#3b82f6' : 
                        segment.mode === 'drive' ? '#10b981' :
                        segment.mode === 'train' ? '#f59e0b' : '#8b5cf6',
          'line-width': 3,
          'line-dasharray': segment.mode === 'flight' ? [0, 4, 3] : [1, 0],
        },
      });
    });

    // Fit to show all routes
    const bounds = new mapboxgl.LngLatBounds();
    segments.forEach(segment => {
      bounds.extend(segment.from.coordinates);
      bounds.extend(segment.to.coordinates);
    });
    mapRef.current.fitBounds(bounds, { padding: 100 });
  }, [segments]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: darkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 2,
    });

    mapRef.current = map;

    map.on('load', () => {
      console.log('Map loaded successfully');
      
      // Add markers and draw routes when segments change
      if (segments && segments.length > 0) {
        updateMapWithSegments();
      }
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      map.remove();
    };
  }, [darkMode]);

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