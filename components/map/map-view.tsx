'use client';

import { useEffect, useRef, useState } from 'react';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

interface MapViewProps {
  stores: Store[];
  center?: { lat: number; lng: number };
  onStoreClick?: (store: Store) => void;
}

export function MapView({ stores, center, onStoreClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key not found');
          setLoading(false);
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          if (!mapRef.current) return;

          const defaultCenter = center || { lat: 35.6812, lng: 139.7671 };

          const map = new google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 15,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });

          mapInstanceRef.current = map;
          setLoading(false);
        };

        script.onerror = () => {
          console.error('Error loading Google Maps');
          setLoading(false);
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setLoading(false);
      }
    };

    initMap();
  }, [center]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    stores.forEach((store) => {
      const marker = new google.maps.Marker({
        position: { lat: Number(store.latitude), lng: Number(store.longitude) },
        map: mapInstanceRef.current!,
        title: store.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: getMarkerColor(store.vacancy_status),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        if (onStoreClick) {
          onStoreClick(store);
        }
      });

      markersRef.current.push(marker);
    });
  }, [stores, onStoreClick]);

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return '#4CAF50';
      case 'moderate':
        return '#FFC107';
      case 'crowded':
        return '#F44336';
      default:
        return '#009688';
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">地図を読み込み中...</p>
          </div>
        </div>
      )}
    </div>
  );
}
