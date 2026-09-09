/* DRIVE v0.38 — Live Drive Intelligence */
(function(){
  "use strict";
  const TILE_URL="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const ATTRIBUTION='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  let map=null,marker=null,routeLine=null,accuracyCircle=null,points=[],speeds=[],initialized=false,resizeObserver=null;
  const $=id=>document.getElementById(id);
  function styles(){if($("driveLiveMapStyles"))return;const s=document.createElement("style");s.id="driveLiveMapStyles";s.textContent=`.live-map-wrap{margin:14px 0 12px;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;background:#0d1012;box-shadow:0 8px 24px rgba(0,0,0,.18)}.live-map-pane{position:relative;overflow:hidden}.live-map{height:250px;width:100%;display:block;background:#e9e7e2;overflow:hidden}.live-map-pane .leaflet-container{width:100%;height:100%;overflow:hidden;background:#e9e7e2}.live-map-pane .leaflet-container img{max-width:none!important;max-height:none!important;width:auto!important}.live-map-pane .leaflet-tile{max-width:none!important;max-height:none!important}.live-map-status{position:absolute;z-index:500;top:12px;left:12px;padding:7px 10px;border:1px solid rgba(255,255,255,.55);border-radius:999px;background:rgba(255,255,255,.9);backdrop-filter:blur(10px);font-size:9px;font-weight:800;letter-spacing:.09em;color:#262626;box-shadow:0 2px 10px rgba(0,0,0,.12)}.live-telemetry{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0 0}.live-telemetry>div{padding:10px 11px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:#111417}.live-telemetry span{display:block;color:#858c93;font-size:8px;letter-spacing:.1em;font-weight:800}.live-telemetry strong{display:block;margin-top:5px;font-size:13px}.leaflet-control-attribution{font-size:8px!important;background:rgba(255,255,255,.78)!important;color:#555}.leaflet-control-attribution a{color:inherit}.leaflet-container{font:inherit}.leaflet-marker-icon,.leaflet-marker-shadow{transition:none!important}@media(min-width:481px){.live-telemetry{grid-template-columns:repeat(4,1fr)}}@media(max-width:480px){.live-map{height:215px}}@media(prefers-reduced-motion:reduce){.live-map-wrap *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}`;
  document.head.appendChild(s)}
  function resizeMap(){
    if(!map)return;
    const container=$("driveLiveMap");
    if(!container||container.clientWidth===0||container.clientHeight===0)return;
    requestAnimationFrame(()=>{
      if(!map)return;
      map.invalidateSize({pan:false,animate:false});
      const last=points[points.length-1];
      if(last)map.setView(last,Math.max(map.getZoom(),15),{animate:false});
    });
  }
  function mount(){
    styles();
    const card=$("tripLiveCard");
    if(!card)return;
    let w=$("driveLiveMapWrap");
    if(!w){
      w=document.createElement("div");w.id="driveLiveMapWrap";w.className="live-map-wrap";
      w.innerHTML='<div class="live-map-pane"><div class="live-map-status" id="liveMapStatus">WAITING FOR GPS</div><div id="driveLiveMap" class="live-map" role="img" aria-label="Live drive map showing your current position and route"></div></div><div class="live-telemetry"><div><span>SPEED</span><strong id="liveSpeed">— KM/H</strong></div><div><span>AVG SPEED</span><strong id="liveAverageSpeed">— KM/H</strong></div><div><span>DISTANCE</span><strong id="liveMapDistance">0.00 KM</strong></div><div><span>GPS QUALITY</span><strong id="liveGpsQuality">—</strong></div></div>';
      const stop=$("stopDriveButton");card.insertBefore(w,stop||null);
    }
    if(!window.L||map)return;
    const container=$("driveLiveMap");
    if(!container||container.clientWidth===0||container.clientHeight===0)return;
    map=L.map(container,{zoomControl:false,attributionControl:true,preferCanvas:true,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:true,dragging:true}).setView([-23.685,24.411],15);
    L.tileLayer(TILE_URL,{maxZoom:19,attribution:ATTRIBUTION,tileSize:256,updateWhenIdle:true,keepBuffer:2}).addTo(map);
    routeLine=L.polyline([],{weight:5,opacity:.9,smoothFactor:1,lineCap:"round",lineJoin:"round"}).addTo(map);
    map.whenReady(()=>{resizeMap();setTimeout(resizeMap,50);setTimeout(resizeMap,250);setTimeout(resizeMap,600)});
    if(window.ResizeObserver){resizeObserver=new ResizeObserver(()=>resizeMap());resizeObserver.observe(container)}
  }
  function quality(a){if(!Number.isFinite(a))return "WAITING";if(a<=10)return "EXCELLENT";if(a<=25)return "GOOD";if(a<=50)return "FAIR";return "WEAK"}
  function update(point,distance){
    mount();if(!map)return;
    const ll=[point.lat,point.lng];points.push(ll);
    const speed=Number.isFinite(point.speed)&&point.speed>=0?point.speed*3.6:0;speeds.push(speed);
    if(!marker)marker=L.circleMarker(ll,{radius:8,weight:3,fillOpacity:.98}).addTo(map);else marker.setLatLng(ll);
    if(!accuracyCircle)accuracyCircle=L.circle(ll,{radius:Math.min(point.accuracy||0,100),weight:1,fillOpacity:.08}).addTo(map);else accuracyCircle.setLatLng(ll).setRadius(Math.min(point.accuracy||0,100));
    routeLine?.setLatLngs(points);resizeMap();
    $("liveSpeed")&&($("liveSpeed").textContent=`${speed.toFixed(0)} KM/H`);$("liveAverageSpeed")&&($("liveAverageSpeed").textContent=`${(speeds.reduce((a,b)=>a+b,0)/speeds.length).toFixed(0)} KM/H`);$("liveMapDistance")&&($("liveMapDistance").textContent=`${Number(distance||0).toFixed(2)} KM`);$("liveGpsQuality")&&($("liveGpsQuality").textContent=quality(point.accuracy));$("liveMapStatus")&&($("liveMapStatus").textContent="GPS LIVE");
  }
  function reset(){points=[];speeds=[];routeLine?.setLatLngs([]);marker?.remove();accuracyCircle?.remove();marker=null;accuracyCircle=null;if($("liveMapStatus"))$("liveMapStatus").textContent="WAITING FOR GPS";if($("liveSpeed"))$("liveSpeed").textContent="— KM/H";if($("liveAverageSpeed"))$("liveAverageSpeed").textContent="— KM/H";if($("liveMapDistance"))$("liveMapDistance").textContent="0.00 KM";if($("liveGpsQuality"))$("liveGpsQuality").textContent="—"}
  function init(){
    if(initialized){resizeMap();setTimeout(resizeMap,100);return}
    initialized=true;styles();mount();resizeMap();
    document.addEventListener("gpsupdate",e=>{if(window.DRIVE_APP?.isTripActive())update(e.detail.point,e.detail.distance)});
    window.addEventListener("drive:datachanged",()=>{if(!window.DRIVE_APP?.isTripActive())reset()});
    window.addEventListener("resize",resizeMap,{passive:true});
  }
  window.DRIVE_LIVE_V038={init,reset};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
