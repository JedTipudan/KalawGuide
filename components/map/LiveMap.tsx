// Native (Android / iOS / Expo Go): Leaflet inside a WebView, fed with live GPS from expo-location.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { WebView as RNWebView, WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { useTheme } from '../../contexts/ThemeContext';
import { buildMapHtml, MapMarker } from './mapHtml';
import { LiveCoords } from '../../features/map/useLiveLocation';

// react-native-webview types WebView as a plain FunctionComponent, but it is a forwardRef at runtime.
interface WebViewHandle { injectJavaScript: (script: string) => void }
const WebView = RNWebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<WebViewHandle> }>;

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

  // Key on marker contents, not array identity, so live location updates never reload the map.
  const markersKey = JSON.stringify(markers);
  const html = useMemo(
    () => buildMapHtml(JSON.parse(markersKey), { primary: colors.primary, surface: colors.surface, text: colors.text, dark: isDark }, focusId),
    [markersKey, focusId, colors.primary, colors.surface, colors.text, isDark],
  );
  const source = useMemo(() => ({ html, baseUrl: 'https://kalawguide.app/' }), [html]);

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
    } catch { /* ignore non-JSON messages */ }
  }

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={ref}
        style={styles.map}
        originWhitelist={['*']}
        source={source}
        onMessage={onMessage}
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
