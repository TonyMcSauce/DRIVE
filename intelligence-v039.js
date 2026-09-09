/* DRIVE v0.39 — Real route maps + complete trip history */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const money=v=>`P${Number(v||0).toFixed(2)}`;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const duration=ms=>{const m=Math.max(0,Math.round(Number(ms||0)/60000)),h=Math.floor(m/60),min=m%60;return h?`${h}h ${String(min).padStart(2,"0")}m`:`${min} min`};
  const dateLabel=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?"Unknown date":d.toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"})};
  const timeLabel=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})};
  const validPoints=trip=>Array.isArray(trip?.points)?trip.points.filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))).map(p=>({lat:Number(p.lat),lng:Number(p.lng)})):[];

  async function fuelModel(){
    const active=typeof getActiveVehicle==="function"?await getActiveVehicle():null;
    const records=(await getAllRecords("fuel")).filter(r=>!active?.id||r.vehicleId==null||r.vehicleId===active.id);
    let litres=0,cost=0,distance=0;
    records.forEach(r=>{litres+=Number(r.litres||0);cost+=Number(r.cost||0);if(Number(r.distance)>0)distance+=Number(r.distance)});
    const economy=distance>0&&litres>0?litres/distance*100:null;
    const pricePerLitre=litres>0?cost/litres:null;
    const costPerKm=distance>0?cost/distance:null;
    return {economy,pricePerLitre,costPerKm};
  }

  function tripEconomics(trip,fuel){
    const km=Number(trip.distance||0);
    if(!km)return {litres:null,cost:null,costPerKm:fuel.costPerKm};
    const litres=fuel.economy>0?km*fuel.economy/100:null;
    const cost=litres!=null&&fuel.pricePerLitre!=null?litres*fuel.pricePerLitre:(fuel.costPerKm!=null?km*fuel.costPerKm:null);
    return {litres,cost,costPerKm:cost!=null?cost/km:fuel.costPerKm};
  }

  function tileXY(lat,lng,z){const n=2**z,x=(lng+180)/360*n,rad=lat*Math.PI/180,y=(1-Math.asinh(Math.tan(rad))/Math.PI)/2*n;return {x,y};}
  function mapMarkup(points,id,height=230){
    if(points.length<1)return `<div class="v039-map-empty">NO GPS TRACE AVAILABLE</div>`;
    const z=15,tiles=[];let sx=0,sy=0;
    points.forEach(p=>{const t=tileXY(p.lat,p.lng,z);sx+=t.x;sy+=t.y});
    const cx=sx/points.length,cy=sy/points.length,tx=Math.floor(cx),ty=Math.floor(cy),size=256,grid=3;
    for(let yy=ty-1;yy<=ty+1;yy++)for(let xx=tx-1;xx<=tx+1;xx++)tiles.push(`<img class="v039-tile" src="https://tile.openstreetmap.org/${z}/${xx}/${yy}.png" alt="" loading="lazy" data-x="${xx}" data-y="${yy}">`);
    const pts=points.map(p=>{const t=tileXY(p.lat,p.lng,z);return [(t.x-tx+1)*size,(t.y-ty+1)*size]});
    const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1]));
    const pad=28,scale=Math.min((760-pad*2)/Math.max(1,maxX-minX),(height-pad*2)/Math.max(1,maxY-minY),1);const offX=(760-(maxX-minX)*scale)/2-minX*scale,offY=(height-(maxY-minY)*scale)/2-minY*scale;
    const poly=pts.map(p=>`${(p[0]*scale+offX).toFixed(1)},${(p[1]*scale+offY).toFixed(1)}`).join(" ");const first=pts[0],last=pts[pts.length-1];
    const fx=(first[0]*scale+offX).toFixed(1),fy=(first[1]*scale+offY).toFixed(1),lx=(last[0]*scale+offX).toFixed(1),ly=(last[1]*scale+offY).toFixed(1);
    const left=Math.max(0,Math.min(256*3-760,((tx-1)*256)-((tx-1)*256))); // retained for deterministic tile viewport
    return `<div class="v039-map" id="${id}" data-tile-z="${z}" data-tx="${tx}" data-ty="${ty}" style="height:${height}px"><div class="v039-tiles" style="left:${left}px;top:0">${tiles.join("")}</div><svg class="v039-route" viewBox="0 0 760 ${height}" preserveAspectRatio="none" aria-label="GPS route"><polyline points="${poly}" fill="none" stroke="rgba(8,12,15,.75)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${poly}" fill="none" stroke="#d8ff3e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${fx}" cy="${fy}" r="7" fill="#fff" stroke="#111417" stroke-width="3"/><circle cx="${lx}" cy="${ly}" r="9" fill="#d8ff3e" stroke="#111417" stroke-width="3"/></svg><span class="v039-map-label start">START</span><span class="v039-map-label end">CURRENT / END</span><span class="v039-attribution">© OpenStreetMap contributors</span></div>`;
  }

  function styles(){if($("driveV039Styles"))return;const s=document.createElement("style");s.id="driveV039Styles";s.textContent=`.v039-map{position:relative;width:100%;overflow:hidden;border-radius:16px;background:#dfe4df}.v039-tiles{position:absolute;width:768px;height:768px;display:grid;grid-template-columns:repeat(3,256px);grid-template-rows:repeat(3,256px);transform-origin:top left}.v039-tile{width:256px;height:256px;display:block}.v039-route{position:absolute;inset:0;width:100%;height:100%;z-index:3;overflow:visible}.v039-map-label{position:absolute;z-index:4;padding:5px 7px;border-radius:999px;background:rgba(255,255,255,.9);font:800 8px system-ui,sans-serif;letter-spacing:.08em;color:#111417;box-shadow:0 2px 8px rgba(0,0,0,.16)}.v039-map-label.start{left:12px;top:12px}.v039-map-label.end{right:12px;top:12px}.v039-attribution{position:absolute;right:7px;bottom:5px;z-index:5;font:7px system-ui,sans-serif;color:#333;background:rgba(255,255,255,.75);padding:2px 4px;border-radius:4px}.v039-map-empty{height:160px;display:grid;place-items:center;border-radius:16px;background:#111417;color:#8d969d;font:800 10px system-ui,sans-serif;letter-spacing:.1em}.v039-trip{border:1px solid rgba(255,255,255,.08);border-radius:18px;background:#101316;overflow:hidden;margin:0 0 12px}.v039-trip summary{list-style:none;cursor:pointer;padding:16px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.v039-trip summary::-webkit-details-marker{display:none}.v039-trip-title{font-size:14px;font-weight:800}.v039-trip-meta{display:block;margin-top:5px;color:#8d969d;font-size:10px}.v039-trip-cost{text-align:right}.v039-trip-cost strong{display:block;font-size:14px}.v039-trip-cost span{display:block;color:#8d969d;font-size:8px;letter-spacing:.08em;margin-top:3px}.v039-details{padding:0 12px 12px}.v039-metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0}.v039-metric{padding:11px;border-radius:12px;background:#171b1f;border:1px solid rgba(255,255,255,.06)}.v039-metric span{display:block;color:#818a91;font-size:8px;font-weight:800;letter-spacing:.1em}.v039-metric strong{display:block;margin-top:5px;font-size:13px}.v039-note{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:rgba(216,255,62,.06);color:#aeb5ba;font-size:9px;line-height:1.5}.v039-section-label{margin:12px 2px 7px;color:#7f888f;font-size:8px;font-weight:800;letter-spacing:.12em}@media(min-width:481px){.v039-metrics{grid-template-columns:repeat(4,1fr)}}@media(prefers-reduced-motion:reduce){.v039-trip summary{scroll-behavior:auto}}`;document.head.appendChild(s)}

  async function renderTripsV039(){
    styles();const history=$("tripHistory");if(!history)return;const active=typeof getActiveVehicle==="function"?await getActiveVehicle():null;const trips=(await getAllRecords("trips")).filter(r=>!active?.id||r.vehicleId==null||r.vehicleId===active.id).sort((a,b)=>new Date(b.startTime||b.createdAt)-new Date(a.startTime||a.createdAt));
    const empty=document.querySelector("#tripsPage .empty-state");if(!trips.length){history.innerHTML="";if(empty)empty.style.display="block";return}if(empty)empty.style.display="none";
    const fuel=await fuelModel();
    history.innerHTML=trips.map((trip,index)=>{const start=new Date(trip.startTime||trip.createdAt),end=new Date(trip.endTime||trip.startTime||trip.createdAt),ms=Number(trip.duration)>0?Number(trip.duration):Math.max(0,end-start),km=Number(trip.distance||0),avg=ms>0?km/(ms/3600000):0,max=Array.isArray(trip.points)?Math.max(0,...trip.points.map(p=>Number(p.speed||0)*3.6).filter(Number.isFinite)):0,eco=tripEconomics(trip,fuel),points=validPoints(trip);return `<details class="v039-trip" ${index===0?"open":""}><summary><div><div class="v039-trip-title">${esc(dateLabel(start))} · ${km.toFixed(2)} km</div><span class="v039-trip-meta">${esc(timeLabel(start))} → ${esc(timeLabel(end))} · ${duration(ms)} · ${points.length.toLocaleString()} GPS points</span></div><div class="v039-trip-cost"><strong>${eco.cost!=null?money(eco.cost):"—"}</strong><span>EST. FUEL COST</span></div></summary><div class="v039-details"><div class="v039-section-label">ROUTE</div>${mapMarkup(points,`tripMapV039_${trip.id||index}`,210)}<div class="v039-section-label">TRIP DATA</div><div class="v039-metrics"><div class="v039-metric"><span>DISTANCE</span><strong>${km.toFixed(2)} km</strong></div><div class="v039-metric"><span>DURATION</span><strong>${duration(ms)}</strong></div><div class="v039-metric"><span>AVG SPEED</span><strong>${avg>0?avg.toFixed(0):"—"} km/h</strong></div><div class="v039-metric"><span>MAX SPEED</span><strong>${max>0?max.toFixed(0):"—"} km/h</strong></div><div class="v039-metric"><span>EST. FUEL</span><strong>${eco.litres!=null?eco.litres.toFixed(2):"—"} L</strong></div><div class="v039-metric"><span>FUEL COST</span><strong>${eco.cost!=null?money(eco.cost):"—"}</strong></div><div class="v039-metric"><span>COST / KM</span><strong>${eco.costPerKm!=null?money(eco.costPerKm):"—"}</strong></div><div class="v039-metric"><span>GPS TRACE</span><strong>${points.length?points.length.toLocaleString():"None"}</strong></div></div>${eco.cost!=null?`<div class="v039-note">Estimated from your recorded fuel history${fuel.economy?` using ${fuel.economy.toFixed(2)} L/100 km`:""}${fuel.pricePerLitre?` and an average fuel price of ${money(fuel.pricePerLitre)}/L`:""}. This is an estimate, not a direct fuel measurement.</div>`:`<div class="v039-note">Add fuel records with litres, cost and odometer distance to let DRIVE calculate the fuel cost of this trip.</div>`}</div></details>`}).join("");
  }

  function init(){styles();window.renderTrips=renderTripsV039;if(typeof renderTripsV039==="function")renderTripsV039();}
  window.DRIVE_TRIPS_V039={refresh:renderTripsV039};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
