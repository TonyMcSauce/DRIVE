/* DRIVE v0.41 — Trip intelligence baseline and driving profile */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const money=v=>`P${Number(v||0).toFixed(2)}`;
  const duration=ms=>{const m=Math.max(0,Math.round(Number(ms||0)/60000)),h=Math.floor(m/60),min=m%60;return h?`${h}h ${String(min).padStart(2,"0")}m`:`${min} min`};
  const km=v=>Number(v||0).toFixed(1);
  async function data(){
    const active=typeof getActiveVehicle==="function"?await getActiveVehicle():null;
    const filter=r=>!active?.id||r.vehicleId==null||r.vehicleId===active.id;
    const trips=(await getAllRecords("trips")).filter(filter).sort((a,b)=>new Date(a.startTime||a.createdAt)-new Date(b.startTime||b.createdAt));
    const fuel=(await getAllRecords("fuel")).filter(filter);
    const validTrips=trips.filter(t=>Number(t.distance)>0);
    const totalKm=validTrips.reduce((s,t)=>s+Number(t.distance||0),0);
    const totalMs=validTrips.reduce((s,t)=>s+Number(t.duration||0),0);
    const avgKm=validTrips.length?totalKm/validTrips.length:0;
    const avgDuration=validTrips.length?totalMs/validTrips.length:0;
    const fuelLitres=fuel.reduce((s,r)=>s+Number(r.litres||0),0);
    const fuelCost=fuel.reduce((s,r)=>s+Number(r.cost||0),0);
    const fuelDistance=fuel.reduce((s,r)=>s+(Number(r.distance)>0?Number(r.distance):0),0);
    const economy=fuelDistance>0&&fuelLitres>0?fuelLitres/fuelDistance*100:null;
    const price=fuelLitres>0?fuelCost/fuelLitres:null;
    const last=validTrips.at(-1)||null;
    return {trips,validTrips,totalKm,totalMs,avgKm,avgDuration,fuelLitres,fuelCost,economy,price,last};
  }
  function styles(){
    if($("driveV041Styles"))return;
    const s=document.createElement("style");s.id="driveV041Styles";s.textContent=`
      .v041-panel{margin-top:18px}.v041-panel .panel-header{margin-bottom:12px}
      .v041-kicker{font-size:9px;letter-spacing:.12em;font-weight:800;color:#858c93}
      .v041-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .v041-stat{padding:12px;border-radius:12px;background:#111417;border:1px solid rgba(255,255,255,.07)}
      .v041-stat span{display:block;color:#858c93;font-size:8px;font-weight:800;letter-spacing:.1em}.v041-stat strong{display:block;margin-top:5px;font-size:15px}.v041-stat small{display:block;margin-top:3px;color:#70787e;font-size:8px}
      .v041-insight{margin-top:9px;padding:12px;border-radius:12px;background:rgba(216,255,62,.055);border:1px solid rgba(216,255,62,.11)}
      .v041-insight strong{display:block;font-size:11px}.v041-insight p{margin:5px 0 0;color:#aeb5ba;font-size:10px;line-height:1.45}
      @media(min-width:481px){.v041-grid{grid-template-columns:repeat(4,1fr)}}
    `;document.head.appendChild(s);
  }
  function target(){
    const dash=$("dashboardPage");if(!dash)return null;
    let panel=$("driveV041Panel");
    if(!panel){panel=document.createElement("section");panel.id="driveV041Panel";panel.className="panel v041-panel";panel.setAttribute("aria-labelledby","v041-title");const briefing=$("driveBriefing");if(briefing)briefing.insertAdjacentElement("afterend",panel);else{const actions=dash.querySelector("[aria-labelledby=quick-actions-title]");actions?.insertAdjacentElement("beforebegin",panel)}}
    return panel;
  }
  async function refresh(){
    styles();const panel=target();if(!panel)return;
    const d=await data();
    if(!d.validTrips.length){panel.innerHTML=`<div class="panel-header"><div><span class="eyebrow">TRIP INTELLIGENCE</span><h2 id="v041-title">YOUR DRIVING</h2></div><span class="v041-kicker">BASELINE</span></div><div class="v041-insight"><strong>Building your driving profile</strong><p>Record a few drives and DRIVE will learn your typical distance, duration and usage pattern.</p></div>`;return}
    const last=d.last, avgSpeed=d.avgDuration>0?d.avgKm/(d.avgDuration/3600000):0;
    let comparison="";
    if(last){
      const diff=d.avgKm>0?(Number(last.distance)-d.avgKm)/d.avgKm*100:0;
      comparison=Math.abs(diff)<8?"This trip is close to your normal trip distance.":diff>0?`This trip was ${Math.round(diff)}% longer than your current average.`:`This trip was ${Math.round(Math.abs(diff))}% shorter than your current average.`;
    }
    panel.innerHTML=`<div class="panel-header"><div><span class="eyebrow">TRIP INTELLIGENCE</span><h2 id="v041-title">YOUR DRIVING</h2></div><span class="v041-kicker">${d.validTrips.length} TRIPS</span></div><div class="v041-grid"><div class="v041-stat"><span>TOTAL DISTANCE</span><strong>${km(d.totalKm)} km</strong><small>RECORDED TRIPS</small></div><div class="v041-stat"><span>AVG TRIP</span><strong>${km(d.avgKm)} km</strong><small>PER DRIVE</small></div><div class="v041-stat"><span>AVG DURATION</span><strong>${duration(d.avgDuration)}</strong><small>PER DRIVE</small></div><div class="v041-stat"><span>AVG SPEED</span><strong>${avgSpeed?avgSpeed.toFixed(0):"—"} km/h</strong><small>TRIP AVERAGE</small></div></div><div class="v041-insight"><strong>${esc(comparison)}</strong><p>${d.economy?`Your current fuel baseline is ${d.economy.toFixed(2)} L/100 km at about ${money(d.price)}/L.`:"Add more fuel records to connect driving behaviour with fuel economics."}</p></div>`;
  }
  function init(){styles();refresh()}
  window.DRIVE_TRIP_INTELLIGENCE_V041={refresh};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
