// Web: the same Leaflet page in a srcdoc iframe. A srcdoc frame shares the site's origin, so it is
// allowed under the COOP/COEP headers that expo-sqlite needs (a cross-origin OpenStreetMap embed is not).
import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { buildMapHtml } from './mapHtml';
import type { LiveMapProps } from './LiveMap';
import type { LiveCoords } from '../../features/map/useLiveLocation';

export function LiveMap({ markers, focusId, user, onOpenMarker, onRequestLocate, style }: LiveMapProps) {
  const { colors, isDark } = useTheme();
  const frame = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false);
  const userRef = useRef(user);
  const handlers = useRef({ onOpenMarker, onRequestLocate });
  useEffect(() => {
    userRef.current = user;
    handlers.current = { onOpenMarker, onRequestLocate };
  }, [user, onOpenMarker, onRequestLocate]);

  // Key on marker contents, not array identity, so live location updates never reload the map.
  const markersKey = JSON.stringify(markers);
  const html = useMemo(
    () => buildMapHtml(JSON.parse(markersKey), { primary: colors.primary, surface: colors.surface, text: colors.text, dark: isDark }, focusId),
    [markersKey, focusId, colors.primary, colors.surface, colors.text, isDark],
  );

  function pushUser(u: LiveCoords | null | undefined) {
    if (!u || !ready.current) return;
    frame.current?.contentWindow?.postMessage({ kgmapUser: { lat: u.lat, lng: u.lng, acc: u.accuracy } }, '*');
  }

  useEffect(() => { ready.current = false; }, [html]);
  useEffect(() => { pushUser(user); }, [user]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== frame.current?.contentWindow) return;
      const msg = e.data?.kgmap;
      if (!msg) return;
      if (msg.type === 'ready') { ready.current = true; pushUser(userRef.current); }
      else if (msg.type === 'open') handlers.current.onOpenMarker?.(msg.id);
      else if (msg.type === 'locate') handlers.current.onRequestLocate?.();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <View style={[styles.wrap, style]}>
      <iframe
        ref={frame}
        title="KalawGuide live map"
        srcDoc={html}
        style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
        allow="geolocation"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
