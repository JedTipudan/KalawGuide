// Native (Android / iOS / Expo Go): the map page (MapTiler, Google or keyless Leaflet) inside a WebView,
// fed with live GPS from expo-location.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Linking } from 'react-native';
import { WebView as RNWebView, WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { useTheme } from '../../contexts/ThemeContext';
import { buildMapHtml, MapMarker } from './mapHtml';
import { LiveCoords } from '../../features/map/useLiveLocation';

// react-native-webview types WebView as a plain FunctionComponent, but it is a forwardRef at runtime.
interface WebViewHandle { injectJavaScript: (script: string) => void }
const WebView = RNWebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<WebViewHandle> }>;

// The map page's origin. Map API keys restricted by website/origin must allow this (see guide.html).
export const BASE_URL = 'https://kalawguide.app/';

export interface LiveMapProps {
  markers: MapMarker[];
  focusId?: string;
  user?: LiveCoords | null;
  onOpenMarker?: (id: string) => void;
  onRequestLocate?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function LiveMap({ markers, focusId, user, onOpenMarker, onRequestLocate, style }: LiveMapProps) {
  const { colors, isDark } = useTheme();
  const ref = useRef<WebViewHandle>(null);
  const ready = useRef(false);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  // Set when a real-map page reports a missing/invalid key: redraw with the keyless map.
  const [forceFree, setForceFree] = useState(false);

  // Key on marker contents, not array identity, so live location updates never reload the map.
  const markersKey = JSON.stringify(markers);
  const html = useMemo(
    () => buildMapHtml(JSON.parse(markersKey), { primary: colors.primary, surface: colors.surface, text: colors.text, dark: isDark }, focusId, { forceFree }),
    [markersKey, focusId, colors.primary, colors.surface, colors.text, isDark, forceFree],
  );
  const source = useMemo(() => ({ html, baseUrl: BASE_URL }), [html]);

  function pushUser(u: LiveCoords | null | undefined) {
    if (!u || !ready.current) return;
    ref.current?.injectJavaScript(`window.setUser&&window.setUser(${u.lat},${u.lng},${u.accuracy ?? 'null'});true;`);
  }

  useEffect(() => { pushUser(user); }, [user]);

  function onMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') { ready.current = true; pushUser(userRef.current); }
      else if (msg.type === 'open') onOpenMarker?.(msg.id);
      else if (msg.type === 'locate') onRequestLocate?.();
      else if (msg.type === 'fallback') {
        console.warn(`Map key problem (${msg.reason}); using the keyless map. See guide.html → Real map.`);
        setForceFree(true);
      }
    } catch { /* ignore non-JSON messages */ }
  }

  // Links inside the map (attributions, Google terms) open in the browser instead of replacing the map.
  function onShouldStartLoad(req: ShouldStartLoadRequest) {
    const external = /^https?:/.test(req.url) && !req.url.startsWith(BASE_URL) && req.isTopFrame !== false;
    if (external) { Linking.openURL(req.url).catch(() => {}); return false; }
    return true;
  }

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={ref}
        style={styles.map}
        originWhitelist={['*']}
        source={source}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStartLoad}
        onLoadStart={() => { ready.current = false; }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  map: { flex: 1, backgroundColor: 'transparent' },
});
