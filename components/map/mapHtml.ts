// Self-contained Leaflet page used by LiveMap on both mobile (WebView) and web (iframe srcdoc).
// Tiles: CARTO Voyager (free, no API key, no Referer requirement — unlike tile.openstreetmap.org,
// which blocks requests from in-app WebViews). Attribution must stay visible.

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

export function buildMapHtml(markers: MapMarker[], theme: MapTheme, focusId?: string): string {
  const data = JSON.stringify(markers).replace(/</g, '\\u003c');
  const tiles = theme.dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{margin:0;padding:0;width:100%;height:100%;background:${theme.surface};}
  .kg-btn{position:absolute;right:10px;z-index:1000;width:40px;height:40px;border-radius:12px;border:0;
    background:${theme.surface};color:${theme.text};font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;}
  #locate{bottom:28px}
  #fit{bottom:76px;font-size:16px}
  .me{width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 0 rgba(37,99,235,.6);animation:p 2s infinite;}
  @keyframes p{0%{box-shadow:0 0 0 0 rgba(37,99,235,.6)}70%{box-shadow:0 0 0 14px rgba(37,99,235,0)}100%{box-shadow:0 0 0 0 rgba(37,99,235,0)}}
  .leaflet-popup-content{font:14px/1.4 system-ui,sans-serif;margin:10px 12px}
  .leaflet-popup-content b{display:block}
  .leaflet-popup-content a{color:${theme.primary};font-weight:600;cursor:pointer}
</style>
</head><body>
<div id="map"></div>
<button id="fit" class="kg-btn" title="Show all places" aria-label="Show all places">⤢</button>
<button id="locate" class="kg-btn" title="Show my location" aria-label="Show my location">◎</button>
<script>
var markers=${data}, focusId=${JSON.stringify(focusId ?? null)};
function send(o){
  if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(o));}
  else if(window.parent!==window){window.parent.postMessage({kgmap:o},'*');}
}
var map=L.map('map',{zoomControl:true,tap:false});
L.tileLayer('${tiles}',{maxZoom:19,subdomains:'abcd',
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'}).addTo(map);
var group=L.featureGroup().addTo(map);
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
var me=null, meCircle=null, last=null;
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
window.addEventListener('message',function(e){var d=e.data&&e.data.kgmapUser;if(d)window.setUser(d.lat,d.lng,d.acc);});
send({type:'ready'});
</script></body></html>`;
}
