'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

// Hardcode the token for testing
mapboxgl.accessToken = 'pk.eyJ1Ijoic2luZ2hhOSIsImEiOiJjbWJydTZoY3UwY2Y5MmlzZnF1OWlkcTVyIn0.IOTqGKwIiKT4o_5kd-j5Lw';

export default function TestMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    if (!mapContainer.current) {
      setStatus('Container not found');
      return;
    }

    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-74.5, 40],
        zoom: 9
      });

      map.on('load', () => {
        setStatus('✅ Map loaded successfully!');
        console.log('✅ Map loaded!');
      });

      map.on('error', (e) => {
        setStatus(`❌ Map error: ${e.error.message || 'Unknown error'}`);
        console.error('❌ Map error:', e);
      });

      return () => map.remove();
    } catch (error) {
      setStatus(`❌ Failed to initialize: ${error}`);
      console.error('Failed to initialize map:', error);
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold">Map Test Page</h1>
        <p>Status: {status}</p>
        <p>Token: {mapboxgl.accessToken ? '✅ Set' : '❌ Not set'}</p>
      </div>
      <div ref={mapContainer} className="flex-1" />
    </div>
  );
}