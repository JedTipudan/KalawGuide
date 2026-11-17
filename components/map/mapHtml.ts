// Map pages used by LiveMap on both mobile (WebView) and web (iframe srcdoc).
// With a MapTiler or Google key you get a real vector / Google map (realMapHtml.ts); without one,
// the keyless Leaflet map below is used.
//
// The keyless map needs NO API KEY. Since 25 Sep 2026 CARTO's free tiles need a key (without one they show an
// "API KEY REQUIRED" watermark), so the default map now uses keyless sources:
//   1. Esri World Street Map (dark mode: Esri Dark Gray + labels) — loads in Expo Go, APKs and browsers.
//   2. OpenStreetMap standard tiles — used automatically if Esri tiles fail to load.
//   3. 🛰 button: Esri World Imagery (satellite) with place labels.
// Optional: set EXPO_PUBLIC_CARTO_KEY (free from carto.com/basemaps/apikey) to use CARTO first instead.
// Leaflet itself loads from unpkg, falling back to jsDelivr then cdnjs. Attribution must stay visible.

import { buildGoogleMapHtml, buildMapTilerHtml } from './realMapHtml';

const CARTO_KEY = (process.env.EXPO_PUBLIC_CARTO_KEY ?? '').trim();

interface TileSource { url: string; attribution: string; subdomains?: string; overlay?: string; maxNativeZoom?: number }

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_ATTR = 'Tiles &copy; <a href="https://www.esri.com" target="_blank">Esri</a> and contributors';
const OSM: TileSource = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  maxNativeZoom: 19,
};

/** Street-map sources in the order they are tried. Exported for tests. */
export function streetSources(dark: boolean, cartoKey = CARTO_KEY): TileSource[] {
  const list: TileSource[] = [];
  if (cartoKey) {
    const style = dark ? 'dark_all' : 'rastertiles/voyager';
    list.push({
      url: `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
      subdomains: 'abcd',
    });
  }
  list.push(dark
    ? { url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, overlay: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, attribution: ESRI_ATTR, maxNativeZoom: 16 }
    : { url: `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`, attribution: ESRI_ATTR, maxNativeZoom: 19 });
  list.push(OSM);
  return list;
}

const SATELLITE: TileSource = {
  url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
  overlay: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
  attribution: 'Imagery ' + ESRI_ATTR + ', Maxar, Earthstar Geographics',
  maxNativeZoom: 19,
};

export interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
}

export interface MapTheme {
  primary: string;
  surface: string;
  text: string;
  dark: boolean;
}

// ─── Which map to draw ────────────────────────────────────────────────────────
// A real map with a free API key is preferred; the keyless map is the safety net.
//   EXPO_PUBLIC_MAPTILER_KEY     → MapTiler vector map (recommended, free plan, no card)
//   EXPO_PUBLIC_GOOGLE_MAPS_KEY  → Google Maps JavaScript API
//   EXPO_PUBLIC_MAP_PROVIDER     → optional: "maptiler" | "google" | "free" to force one when several keys are set
// Expo inlines EXPO_PUBLIC_* at build time, so each value must be read with its full literal name.

export type MapProvider = 'maptiler' | 'google' | 'free';

export interface MapEnv { maptilerKey?: string; googleKey?: string; prefer?: string }

const ENV: MapEnv = {
  maptilerKey: process.env.EXPO_PUBLIC_MAPTILER_KEY,
  googleKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
  prefer: process.env.EXPO_PUBLIC_MAP_PROVIDER,
};

export function chooseMapProvider(env: MapEnv = ENV): MapProvider {
  const mt = (env.maptilerKey ?? '').trim();
  const gg = (env.googleKey ?? '').trim();
  const prefer = (env.prefer ?? '').trim().toLowerCase();
  if (prefer === 'free') return 'free';
  if (prefer === 'google' && gg) return 'google';
  if (prefer === 'maptiler' && mt) return 'maptiler';
  if (mt) return 'maptiler';
  if (gg) return 'google';
  return 'free';
}

/**
 * The map page for LiveMap. `forceFree` is set after a real-map page reported a bad key
 * ({type:'fallback'}), so the user still gets a working map.
 */
export function buildMapHtml(
  markers: MapMarker[], theme: MapTheme, focusId?: string,
  opts: { forceFree?: boolean; env?: MapEnv } = {},
): string {
  const env = opts.env ?? ENV;
  const provider = opts.forceFree ? 'free' : chooseMapProvider(env);
  if (provider === 'maptiler') return buildMapTilerHtml(markers, theme, focusId, { key: env.maptilerKey!.trim() });
  if (provider === 'google') return buildGoogleMapHtml(markers, theme, focusId, env.googleKey!.trim());
  return buildFreeMapHtml(markers, theme, focusId);
}

/** Keyless map: Leaflet + Esri / OpenStreetMap tiles. */
export function buildFreeMapHtml(markers: MapMarker[], theme: MapTheme, focusId?: string): string {
  const data = JSON.stringify(markers).replace(/</g, '\\u003c');
  const sources = JSON.stringify(streetSources(theme.dark)).replace(/</g, '\\u003c');
  const satellite = JSON.stringify(SATELLITE).replace(/</g, '\\u003c');

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  html,body,#map{margin:0;padding:0;width:100%;height:100%;background:${theme.surface};}
  .kg-btn{position:absolute;right:10px;z-index:1000;width:40px;height:40px;border-radius:12px;border:0;
    background:${theme.surface};color:${theme.text};font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;}
  #locate{bottom:28px}
  #fit{bottom:76px;font-size:16px}
  #sat{bottom:124px;font-size:18px}
  #sat.on{background:${theme.primary};color:#fff}
  .me{width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 0 rgba(37,99,235,.6);animation:p 2s infinite;}
  @keyframes p{0%{box-shadow:0 0 0 0 rgba(37,99,235,.6)}70%{box-shadow:0 0 0 14px rgba(37,99,235,0)}100%{box-shadow:0 0 0 0 rgba(37,99,235,0)}}
  .leaflet-popup-content{font:14px/1.4 system-ui,sans-serif;margin:10px 12px}
  .leaflet-popup-content b{display:block}
  .leaflet-popup-content a{color:${theme.primary};font-weight:600;cursor:pointer}
  #offline{display:none;position:absolute;inset:0;z-index:2000;align-items:center;justify-content:center;text-align:center;
    padding:24px;font:15px/1.5 system-ui,sans-serif;color:${theme.text};background:${theme.surface}}
</style>
</head><body>
<div id="map"></div>
<div id="offline">🗺<br><b>The map needs an internet connection.</b><br>No API key is required. Connect to Wi-Fi or mobile data, then tap here to retry.</div>
<button id="sat" class="kg-btn" title="Satellite view" aria-label="Satellite view">🛰</button>
<button id="fit" class="kg-btn" title="Show all places" aria-label="Show all places">⤢</button>
<button id="locate" class="kg-btn" title="Show my location" aria-label="Show my location">◎</button>
<script>
var CDNS=['https://unpkg.com/leaflet@1.9.4/dist/','https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/','https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/'];
function loadLeaflet(i){
  if(i>=CDNS.length){var o=document.getElementById('offline');o.style.display='flex';o.onclick=function(){location.reload();};return;}
  var css=document.createElement('link');css.rel='stylesheet';css.href=CDNS[i]+'leaflet.css';document.head.appendChild(css);
  var js=document.createElement('script');js.src=CDNS[i]+'leaflet.js';
  js.onload=start;js.onerror=function(){css.remove();loadLeaflet(i+1);};
  document.head.appendChild(js);
}
var markers=${data}, focusId=${JSON.stringify(focusId ?? null)};
function send(o){
  if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(o));}
  else if(window.parent!==window){window.parent.postMessage({kgmap:o},'*');}
}
var map, group, me=null, meCircle=null, last=null, pending=null;
window.setUser=function(lat,lng,acc){pending=[lat,lng,acc];};
window.addEventListener('message',function(e){var d=e.data&&e.data.kgmapUser;if(d)window.setUser(d.lat,d.lng,d.acc);});
function start(){
map=L.map('map',{zoomControl:true,tap:false});
// Base map: try each street source in turn; if one keeps failing (blocked, offline, needs a key) use the next.
var SOURCES=${sources}, SAT=${satellite}, base=[], srcIndex=0, satOn=false;
function makeLayers(src){
  var opts={maxZoom:19,maxNativeZoom:src.maxNativeZoom||19,attribution:src.attribution,crossOrigin:true};
  if(src.subdomains)opts.subdomains=src.subdomains;
  var layers=[L.tileLayer(src.url,opts)];
  if(src.overlay)layers.push(L.tileLayer(src.overlay,{maxZoom:19,maxNativeZoom:src.maxNativeZoom||19,crossOrigin:true}));
  return layers;
}
function showBase(src,isStreet){
  base.forEach(function(l){map.removeLayer(l);});
  base=makeLayers(src);
  var loaded=false, errors=0;
  base[0].on('tileload',function(){loaded=true;});
  base[0].on('tileerror',function(){
    errors++;
    if(isStreet&&!loaded&&errors>=3&&srcIndex<SOURCES.length-1){srcIndex++;showBase(SOURCES[srcIndex],true);}
  });
  base.forEach(function(l){l.addTo(map);});
}
showBase(SOURCES[0],true);
var satBtn=document.getElementById('sat');
satBtn.onclick=function(){
  satOn=!satOn;satBtn.className='kg-btn'+(satOn?' on':'');
  showBase(satOn?SAT:SOURCES[srcIndex],!satOn);
};
group=L.featureGroup().addTo(map);
markers.forEach(function(m){
  var focused=m.id===focusId;
  var c=L.circleMarker([m.lat,m.lng],{radius:focused?11:8,color:'#fff',weight:2,fillColor:'${theme.primary}',fillOpacity:1}).addTo(group);
  var html='<b>'+m.name.replace(/</g,'&lt;')+'</b>'+(m.subtitle?m.subtitle.replace(/</g,'&lt;')+'<br>':'')+(focusId?'':'<a data-id="'+m.id+'">View details ›</a>');
  c.bindPopup(html);
  c.on('popupopen',function(e){var a=e.popup.getElement().querySelector('a[data-id]');if(a)a.onclick=function(){send({type:'open',id:m.id});};});
  if(focused)setTimeout(function(){c.openPopup();},300);
});
function fitAll(){
  var f=markers.filter(function(m){return m.id===focusId;})[0];
  if(f){map.setView([f.lat,f.lng],14);}
  else if(markers.length){map.fitBounds(group.getBounds(),{padding:[30,30],maxZoom:13});}
  else{map.setView([6.9497,126.2167],12);}
}
fitAll();
window.setUser=function(lat,lng,acc){
  last=[lat,lng];
  if(!me){
    me=L.marker(last,{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[22,22],iconAnchor:[11,11]}),zIndexOffset:1000}).addTo(map).bindPopup('You are here');
    meCircle=L.circle(last,{radius:acc||30,color:'#2563EB',weight:1,fillOpacity:.1}).addTo(map);
  }else{me.setLatLng(last);meCircle.setLatLng(last);meCircle.setRadius(acc||30);}
};
document.getElementById('locate').onclick=function(){
  if(last){map.setView(last,15);}else{send({type:'locate'});}
};
document.getElementById('fit').onclick=fitAll;
if(pending)window.setUser(pending[0],pending[1],pending[2]);
send({type:'ready'});
}
loadLeaflet(0);
</script></body></html>`;
}
