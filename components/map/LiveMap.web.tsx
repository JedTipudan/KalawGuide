// Web: the same map page in an iframe loaded from a blob: URL. A blob frame shares the site's origin, so it
// is allowed under the COOP/COEP headers that expo-sqlite needs (a cross-origin map embed is not).
// Not srcdoc: inside an about:srcdoc frame MapLibre's tile worker never gets its tiles back, so the
// MapTiler map stayed blank with only the pins showing. A blob: frame has a real URL and works.
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  // Set when a real-map page reports a missing/invalid key: redraw with the keyless map.
  const [forceFree, setForceFree] = useState(false);
  useEffect(() => {
    userRef.current = user;
    handlers.current = { onOpenMarker, onRequestLocate };
  }, [user, onOpenMarker, onRequestLocate]);

  // Key on marker contents, not array identity, so live location updates never reload the map.
  const markersKey = JSON.stringify(markers);
  const html = useMemo(
    () => buildMapHtml(JSON.parse(markersKey), { primary: colors.primary, surface: colors.surface, text: colors.text, dark: isDark }, focusId, { forceFree }),
    [markersKey, focusId, colors.primary, colors.surface, colors.text, isDark, forceFree],
  );

  function pushUser(u: LiveCoords | null | undefined) {
    if (!u || !ready.current) return;
    frame.current?.contentWindow?.postMessage({ kgmapUser: { lat: u.lat, lng: u.lng, acc: u.accuracy } }, '*');
  }

  // Turn the page into a blob: URL; free the old one when the page changes or the map unmounts.
  const src = useMemo(() => URL.createObjectURL(new Blob([html], { type: 'text/html' })), [html]);
  useEffect(() => () => URL.revokeObjectURL(src), [src]);

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
      else if (msg.type === 'fallback') {
        console.warn(`Map key problem (${msg.reason}); using the keyless map. See guide.html → Real map.`);
        setForceFree(true);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <View style={[styles.wrap, style]}>
      <iframe
        ref={frame}
        title="KalawGuide live map"
        src={src}
        style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
        allow="geolocation"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
