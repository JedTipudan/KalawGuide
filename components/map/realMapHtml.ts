// "Real map" engines that need a free API key. Both speak the same tiny message protocol as the
// keyless Leaflet map (ready / open / locate / fallback, and window.setUser for the blue dot), so
// LiveMap works with any of them unchanged.
//
//  • MapTiler (recommended): vector street map, satellite-hybrid and 3D tilt, drawn by MapLibre GL.
//    Free plan, no credit card. https://cloud.maptiler.com
//  • Google Maps JavaScript API: Google's own map. Needs a Google Cloud billing account
//    (a monthly free usage cap applies).
//
// If a key is missing, wrong or not allowed for this origin, the page sends {type:'fallback'} and
// LiveMap switches to the keyless map — the app never shows a broken map.

import type { MapMarker, MapTheme } from './mapHtml';

const esc = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

/** Shared <head> styles, buttons and JS helpers for every engine. */
function shell(theme: MapTheme, headExtra: string, offlineText: string): { head: string; body: string; js: string } {
  const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
${headExtra}
<style>
  html,body,#map{margin:0;padding:0;width:100%;height:100%;background:${theme.surface};}
  .kg-btn{position:absolute;right:10px;z-index:1000;width:40px;height:40px;border-radius:12px;border:0;
    background:${theme.surface};color:${theme.text};font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;}
  .kg-btn.on{background:${theme.primary};color:#fff}
  #locate{bottom:36px} #fit{bottom:84px;font-size:16px} #sat{bottom:132px} #tilt{bottom:180px;font-size:13px;font-weight:700}
  .pin{width:18px;height:18px;border-radius:50%;background:${theme.primary};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4);cursor:pointer}
  .pin.focus{width:24px;height:24px}
  .me{width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 0 rgba(37,99,235,.6);animation:p 2s infinite;}
  @keyframes p{0%{box-shadow:0 0 0 0 rgba(37,99,235,.6)}70%{box-shadow:0 0 0 14px rgba(37,99,235,0)}100%{box-shadow:0 0 0 0 rgba(37,99,235,0)}}
  .kg-pop{font:14px/1.4 system-ui,sans-serif;color:#1F2937}
  .kg-pop b{display:block}
  .kg-pop a{color:${theme.primary};font-weight:600;cursor:pointer}
  #offline{display:none;position:absolute;inset:0;z-index:2000;align-items:center;justify-content:center;text-align:center;
    padding:24px;font:15px/1.5 system-ui,sans-serif;color:${theme.text};background:${theme.surface}}
</style>`;
  const body = `<div id="map"></div>
<div id="offline">🗺<br><b>${offlineText}</b><br>Connect to Wi-Fi or mobile data, then tap here to retry.</div>
<button id="tilt" class="kg-btn" title="3D view" aria-label="3D view">3D</button>
<button id="sat" class="kg-btn" title="Satellite view" aria-label="Satellite view">🛰</button>
<button id="fit" class="kg-btn" title="Show all places" aria-label="Show all places">⤢</button>
<button id="locate" class="kg-btn" title="Show my location" aria-label="Show my location">◎</button>`;
  const js = `
function send(o){
  if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(o));}
  else if(window.parent!==window){window.parent.postMessage({kgmap:o},'*');}
}
var fellBack=false;
function fallback(reason){if(fellBack)return;fellBack=true;send({type:'fallback',reason:reason});}
function offline(){var o=document.getElementById('offline');o.style.display='flex';o.onclick=function(){location.reload();};}
function popupHtml(m){
  return '<div class="kg-pop"><b>'+m.name.replace(/</g,'&lt;')+'</b>'+(m.subtitle?m.subtitle.replace(/</g,'&lt;')+'<br>':'')
    +(focusId?'':'<a data-id="'+m.id+'">View details ›</a>')+'</div>';
}
function wireLink(root,m){var a=root&&root.querySelector('a[data-id]');if(a)a.onclick=function(){send({type:'open',id:m.id});};}
var pending=null;
window.setUser=function(lat,lng,acc){pending=[lat,lng,acc];};
window.addEventListener('message',function(e){var d=e.data&&e.data.kgmapUser;if(d)window.setUser(d.lat,d.lng,d.acc);});
function loadScripts(urls,ok,fail){
  var i=0;(function next(){
    if(i>=urls.length)return fail();
    var s=document.createElement('script');s.src=urls[i++];s.onload=ok;s.onerror=function(){s.remove();next();};document.head.appendChild(s);
  })();
}`;
  return { head, body, js };
}

export interface MapTilerOptions {
  key: string;
  /** Test hook: replace the MapTiler style URLs (e.g. with MapLibre demo tiles). */
  styles?: { street: string; dark: string; satellite: string };
}

export function buildMapTilerHtml(markers: MapMarker[], theme: MapTheme, focusId: string | undefined, opts: MapTilerOptions): string {
  const k = encodeURIComponent(opts.key);
  const styles = opts.styles ?? {
    street: `https://api.maptiler.com/maps/streets-v2/style.json?key=${k}`,
    dark: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${k}`,
    satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=${k}`,
  };
  const v = '4.7.1';
  const { head, body, js } = shell(theme,
    `<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@${v}/dist/maplibre-gl.css" onerror="this.href='https://cdn.jsdelivr.net/npm/maplibre-gl@${v}/dist/maplibre-gl.css'"/>`,
    'The map needs an internet connection.');

  return `<!DOCTYPE html><html><head>${head}
<style>.maplibregl-popup-content{border-radius:12px;padding:10px 12px}</style>
</head><body>${body}
<script>
var markers=${esc(markers)}, focusId=${esc(focusId ?? null)}, STYLES=${esc(styles)}, DARK=${theme.dark};
${js}
loadScripts(['https://unpkg.com/maplibre-gl@${v}/dist/maplibre-gl.js','https://cdn.jsdelivr.net/npm/maplibre-gl@${v}/dist/maplibre-gl.js'], start, offline);
function start(){
  var satOn=false, tilted=false, me=null, last=null, popups={};
  var map=new maplibregl.Map({container:'map',style:DARK?STYLES.dark:STYLES.street,center:[126.2167,6.9497],zoom:11,
    attributionControl:{compact:true},cooperativeGestures:false});
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-left');
  // A rejected key (401/403) or blocked style means "use the keyless map instead".
  map.on('error',function(e){
    var st=e&&e.error&&e.error.status;
    if(st===401||st===403)fallback('maptiler-key');
    else if(!map.isStyleLoaded()&&e&&e.error&&/Failed to fetch|NetworkError|style/i.test(String(e.error.message||'')))fallback('maptiler-style');
  });
  var bounds=new maplibregl.LngLatBounds();
  markers.forEach(function(m){
    var el=document.createElement('div');el.className='pin'+(m.id===focusId?' focus':'');
    var pop=new maplibregl.Popup({offset:14,closeButton:false}).setHTML(popupHtml(m));
    pop.on('open',function(){wireLink(pop.getElement(),m);});
    new maplibregl.Marker({element:el}).setLngLat([m.lng,m.lat]).setPopup(pop).addTo(map);
    popups[m.id]=pop;bounds.extend([m.lng,m.lat]);
  });
  function fitAll(){
    var f=markers.filter(function(m){return m.id===focusId;})[0];
    if(f){map.jumpTo({center:[f.lng,f.lat],zoom:15});}
    else if(markers.length>1){map.fitBounds(bounds,{padding:48,maxZoom:13,duration:0});}
    else if(markers.length===1){map.jumpTo({center:[markers[0].lng,markers[0].lat],zoom:14});}
  }
  fitAll();
  // Safety net: tiles that never arrive (blocked network, broken WebView) must not leave a blank map.
  var watchdog=setTimeout(function(){if(!map.loaded())fallback('maptiler-timeout');},20000);
  map.on('load',function(){
    clearTimeout(watchdog);
    if(focusId&&popups[focusId]){var f=markers.filter(function(m){return m.id===focusId;})[0];popups[focusId].setLngLat([f.lng,f.lat]).addTo(map);}
  });
  // DOM markers don't need the style to finish loading, so the blue dot can appear immediately.
  window.setUser=function(lat,lng){
    last=[lng,lat];
    if(!me){var el=document.createElement('div');el.className='me';
      me=new maplibregl.Marker({element:el}).setLngLat(last).setPopup(new maplibregl.Popup({offset:12,closeButton:false}).setText('You are here')).addTo(map);}
    else me.setLngLat(last);
  };
  if(pending)window.setUser(pending[0],pending[1],pending[2]);
  send({type:'ready'});
  var satBtn=document.getElementById('sat'), tiltBtn=document.getElementById('tilt');
  satBtn.onclick=function(){satOn=!satOn;satBtn.className='kg-btn'+(satOn?' on':'');map.setStyle(satOn?STYLES.satellite:(DARK?STYLES.dark:STYLES.street));};
  tiltBtn.onclick=function(){tilted=!tilted;tiltBtn.className='kg-btn'+(tilted?' on':'');map.easeTo({pitch:tilted?60:0,bearing:tilted?-20:0,duration:800});};
  document.getElementById('fit').onclick=fitAll;
  document.getElementById('locate').onclick=function(){if(last)map.flyTo({center:last,zoom:15});else send({type:'locate'});};
}
</script></body></html>`;
}

// A compact dark style for Google's classic map (ignored when the map uses a cloud Map ID).
const GOOGLE_DARK = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c36' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#071b26' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d4656' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b3a4f' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1f3a40' }] },
];

export function buildGoogleMapHtml(markers: MapMarker[], theme: MapTheme, focusId: string | undefined, key: string): string {
  const { head, body, js } = shell(theme, '', 'The map needs an internet connection.');
  const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=initMap&v=weekly&loading=async`;
  return `<!DOCTYPE html><html><head>${head}</head><body>${body}
<script>
var markers=${esc(markers)}, focusId=${esc(focusId ?? null)}, DARK=${theme.dark}, DARK_STYLE=${esc(GOOGLE_DARK)};
${js}
// Google calls this when the key is invalid, restricted for this origin, or billing is off.
window.gm_authFailure=function(){fallback('google-key');};
function initMap(){
  var satOn=false, tilted=false, me=null, last=null, info=new google.maps.InfoWindow(), pins={};
  var map=new google.maps.Map(document.getElementById('map'),{center:{lat:6.9497,lng:126.2167},zoom:11,
    mapTypeControl:false,streetViewControl:true,fullscreenControl:false,gestureHandling:'greedy',styles:DARK?DARK_STYLE:null});
  var bounds=new google.maps.LatLngBounds();
  function open(m){info.setContent(popupHtml(m));info.open({map:map,anchor:pins[m.id]});}
  google.maps.event.addListener(info,'domready',function(){
    var m=markers.filter(function(x){return info.getContent().indexOf('data-id="'+x.id+'"')>=0;})[0];
    if(m)wireLink(document,m);
  });
  markers.forEach(function(m){
    var p=new google.maps.Marker({position:{lat:m.lat,lng:m.lng},map:map,title:m.name,
      icon:{path:google.maps.SymbolPath.CIRCLE,scale:m.id===focusId?11:8,fillColor:'${theme.primary}',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}});
    p.addListener('click',function(){open(m);});
    pins[m.id]=p;bounds.extend(p.getPosition());
  });
  function fitAll(){
    var f=markers.filter(function(m){return m.id===focusId;})[0];
    if(f){map.setCenter({lat:f.lat,lng:f.lng});map.setZoom(15);}
    else if(markers.length>1){map.fitBounds(bounds,48);}
    else if(markers.length===1){map.setCenter({lat:markers[0].lat,lng:markers[0].lng});map.setZoom(14);}
  }
  fitAll();
  if(focusId&&pins[focusId])open(markers.filter(function(m){return m.id===focusId;})[0]);
  window.setUser=function(lat,lng){
    last={lat:lat,lng:lng};
    if(!me)me=new google.maps.Marker({position:last,map:map,title:'You are here',zIndex:1000,
      icon:{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:'#2563EB',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}});
    else me.setPosition(last);
  };
  var satBtn=document.getElementById('sat'), tiltBtn=document.getElementById('tilt');
  satBtn.onclick=function(){satOn=!satOn;satBtn.className='kg-btn'+(satOn?' on':'');map.setMapTypeId(satOn?'hybrid':'roadmap');};
  // Classic Google maps tilt to 45° only on satellite imagery at high zoom; the button switches to that view.
  tiltBtn.onclick=function(){tilted=!tilted;tiltBtn.className='kg-btn'+(tilted?' on':'');
    if(tilted){satOn=true;satBtn.className='kg-btn on';map.setMapTypeId('hybrid');map.setZoom(Math.max(map.getZoom(),18));map.setTilt(45);}else{map.setTilt(0);}};
  document.getElementById('fit').onclick=fitAll;
  document.getElementById('locate').onclick=function(){if(last){map.panTo(last);map.setZoom(15);}else send({type:'locate'});};
  send({type:'ready'});
  if(pending)window.setUser(pending[0],pending[1],pending[2]);
}
loadScripts(['${src}'], function(){}, offline);
</script></body></html>`;
}
