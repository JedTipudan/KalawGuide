import { buildMapHtml, chooseMapProvider, streetSources } from './mapHtml';
import { buildGoogleMapHtml, buildMapTilerHtml } from './realMapHtml';

const THEME = { primary: '#0E7490', surface: '#fff', text: '#111', dark: false };
const PINS = [{ id: 'a', name: 'Dahican <Beach>', lat: 6.9243, lng: 126.2809 }];
const scriptOf = (html: string) => html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

describe('chooseMapProvider', () => {
  it('uses the keyless map when no key is set', () => {
    expect(chooseMapProvider({})).toBe('free');
    expect(chooseMapProvider({ maptilerKey: '  ' })).toBe('free');
  });
  it('prefers MapTiler, then Google', () => {
    expect(chooseMapProvider({ maptilerKey: 'mt' })).toBe('maptiler');
    expect(chooseMapProvider({ googleKey: 'gg' })).toBe('google');
    expect(chooseMapProvider({ maptilerKey: 'mt', googleKey: 'gg' })).toBe('maptiler');
  });
  it('EXPO_PUBLIC_MAP_PROVIDER can pick one, but only if its key exists', () => {
    expect(chooseMapProvider({ maptilerKey: 'mt', googleKey: 'gg', prefer: 'google' })).toBe('google');
    expect(chooseMapProvider({ maptilerKey: 'mt', prefer: 'google' })).toBe('maptiler');
    expect(chooseMapProvider({ maptilerKey: 'mt', prefer: 'free' })).toBe('free');
  });
});

describe('real map pages', () => {
  it('MapTiler page: MapLibre, streets/hybrid styles with the key, falls back on a rejected key', () => {
    const html = buildMapHtml(PINS, THEME, undefined, { env: { maptilerKey: 'abc123' } });
    expect(html).toContain('maplibre-gl@4.7.1');
    expect(html).toContain('api.maptiler.com/maps/streets-v2/style.json?key=abc123');
    expect(html).toContain('api.maptiler.com/maps/hybrid/style.json?key=abc123');
    expect(html).toContain("fallback('maptiler-key')");
    expect(() => new Function(scriptOf(html))).not.toThrow();
    expect(scriptOf(html)).not.toContain('<Beach>');
  });

  it('Google page: Maps JavaScript API with the key, falls back via gm_authFailure', () => {
    const html = buildMapHtml(PINS, THEME, 'a', { env: { googleKey: 'g-key' } });
    expect(html).toContain('maps.googleapis.com/maps/api/js?key=g-key');
    expect(html).toContain('gm_authFailure');
    expect(() => new Function(scriptOf(html))).not.toThrow();
  });

  it('forceFree (after a bad key) always gives the keyless map', () => {
    const html = buildMapHtml(PINS, THEME, undefined, { env: { maptilerKey: 'abc' }, forceFree: true });
    expect(html).toContain('leaflet@1.9.4');
    expect(html).not.toContain('maptiler');
  });

  it('builders escape keys and data safely', () => {
    expect(buildMapTilerHtml(PINS, THEME, undefined, { key: 'a&b' })).toContain('key=a%26b');
    expect(buildGoogleMapHtml(PINS, THEME, undefined, 'a&b')).toContain('key=a%26b');
  });
});

describe('buildMapHtml', () => {
  const html = buildMapHtml([{ id: 'a', name: 'Dahican <Beach>', lat: 6.93, lng: 126.27 }], THEME, undefined, { env: {} });
  const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

  it('produces valid JavaScript', () => {
    expect(() => new Function(script)).not.toThrow();
  });

  it('uses keyless tiles by default (CARTO now needs a key) and falls back across CDNs', () => {
    expect(html).not.toContain('basemaps.cartocdn.com');
    expect(html).toContain('server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map');
    expect(html).toContain('tile.openstreetmap.org');
    expect(html).toContain('World_Imagery'); // satellite toggle
    expect(html).toContain('cdn.jsdelivr.net/npm/leaflet@1.9.4');
    expect(html).toContain('The map needs an internet connection');
  });

  it('escapes marker data so it cannot break out of the script', () => {
    expect(script).not.toContain('<Beach>');
  });
});

describe('streetSources', () => {
  it('tries Esri first, then OpenStreetMap, with no key', () => {
    const urls = streetSources(false, '').map(s => s.url);
    expect(urls[0]).toContain('World_Street_Map');
    expect(urls[1]).toContain('openstreetmap');
  });

  it('dark mode uses Esri Dark Gray with a label overlay', () => {
    const [first] = streetSources(true, '');
    expect(first.url).toContain('World_Dark_Gray_Base');
    expect(first.overlay).toContain('World_Dark_Gray_Reference');
  });

  it('puts CARTO first only when a free CARTO key is configured', () => {
    const [first, second] = streetSources(false, 'abc123');
    expect(first.url).toContain('basemaps.cartocdn.com');
    expect(first.url).toContain('key=abc123');
    expect(second.url).toContain('World_Street_Map');
  });
});
