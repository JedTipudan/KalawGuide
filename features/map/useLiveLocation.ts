import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export interface LiveCoords {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export type LiveLocationStatus = 'starting' | 'live' | 'denied' | 'unavailable';

/**
 * Watches the device position while the screen is mounted (foreground only).
 * Works on Android, iOS, Expo Go and web (web needs HTTPS or localhost).
 */
export function useLiveLocation(enabled = true) {
  const [coords, setCoords] = useState<LiveCoords | null>(null);
  const [status, setStatus] = useState<LiveLocationStatus>('starting');
  const sub = useRef<Location.LocationSubscription | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (perm !== 'granted') { setStatus('denied'); return; }

        sub.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (loc) => {
            if (cancelled) return;
            setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy ?? null });
            setStatus('live');
          },
          () => { if (!cancelled) setStatus('unavailable'); },
        );
        if (cancelled) sub.current?.remove();
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    })();

    return () => {
      cancelled = true;
      sub.current?.remove();
      sub.current = null;
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => { setStatus('starting'); setAttempt(a => a + 1); }, []);

  return { coords, status, retry };
}

/** Straight-line distance in kilometres (haversine). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}

/** Opens turn-by-turn directions in Google Maps (app if installed, otherwise the website). Free, no key. */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
