/* DRIVE v0.42 — Driving behaviour intelligence */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const km=v=>Number(v||0).toFixed(1);
  const pct=v=>`${Math.round(Math.abs(v))}%`;
  const duration=ms=>{const m=Math.max(0,Math.round(Number(ms||0)/60000)),h=Math.floor(m/60),min=m%60;return h?`${h}h ${String(min).padStart(2,"0")}m`:`${min} min`};
  const points=t=>Array.isArray(t?.points)?t.points.filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))):[];
  async function getData(){
    const active=typeof getActiveVehicle==="function"?await getActiveVehicle():null;
    const filter=r=>!active?.id||r.vehicleId==null||r.vehicleId===active.id;
    const trips=(await getAllRecords("trips")).filter(filter).sort((a,b)=>new Date(a.startTime||a.createdAt)-new Date(b.startTime||b.createdAt));
    const valid=trips.filter(t=>Number(t.distance)>0);
    if(!valid.length)return {valid};
    const avgKm=valid.reduce((s,t)=>s+Number(t.distance),0)/valid.length;
    const avgMs=valid.reduce((s,t)=>s+Number(t.duration||0),0)/valid.length;
    const avgSpeed=avgMs>0?avgKm/(avgMs/3600000):0;
    const speeds=valid.map(t=>{const p=points(t);const vals=p.map(x=>Number(x.speed)*3.6).filter(x=>Number.isFinite(x)&&x>0);return vals.length?Math.max(...vals):0}).filter(x=>x>0);
    const typicalMax=speeds.length?speeds.reduce((a,b)=>a+b,0)/speeds.length:0;
    const last=valid.at(-1);
    const lastKm=Number(last.distance||0),lastMs=Number(last.duration||0),lastSpeed=lastMs>0?lastKm/(lastMs/3600000):0;
    const anomalies=[];
    if(valid.length>=3){
      const distanceDiff=(lastKm-avgKm)/avgKm*100;
      if(Math.abs(distanceDiff)>=25)anomalies.push(distanceDiff>0?`This drive was ${pct(distanceDiff)} longer than your normal trip.`:`This drive was ${pct(distanceDiff)} shorter than your normal trip.`);
      const durationDiff=avgMs>0?(lastMs-avgMs)/avgMs*100:0;
      if(Math.abs(durationDiff)>=30)anomalies.push(durationDiff>0?`It took ${pct(durationDiff)} longer than your typical drive.`:`It was ${pct(durationDiff)} quicker than your typical drive.`);
      const speedDiff=avgSpeed>0?(lastSpeed-avgSpeed)/avgSpeed*100:0;
      if(Math.abs(speedDiff)>=25)anomalies.push(speedDiff>0?`Your average speed was ${pct(speedDiff)} above your normal pattern.`:`Your average speed was ${pct(speedDiff)} below your normal pattern.`);
    }
    const weekday={0:"Sun",1:"Mon",2:"Tue",3:"Wed",4:"Thu",5:"Fri",6:"Sat"};
    const dayCounts={Workday:0,Weekend:0};
    valid.forEach(t=>{const d=new Date(t.startTime||t.createdAt);if([0,6].includes(d.getDay()))dayCounts.Weekend++;else dayCounts.Workday++});
    const dominant=dayCounts.Workday>=dayCounts.Weekend?"workday":"weekend";
    return {valid,avgKm,avgMs,avgSpeed,typicalMax,last,lastKm,lastMs,lastSpeed,anomalies,dominant,dayCounts,weekday};
  }
  function styles(){if($("driveV042Styles"))return;const s=document.createElement("style");s.id="driveV042Styles";s.textContent=`.v042-panel{margin-top:10px}.v042-panel .panel-header{margin-bottom:12px}.v042-kicker{font-size:9px;letter-spacing:.12em;font-weight:800;color:#858c93}.v042-list{display:grid;gap:8px}.v042-row{display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:#111417}.v042-dot{width:8px;height:8px;border-radius:50%;background:#d8ff3e;margin-top:4px;flex:0 0 auto}.v042-row strong{display:block;font-size:11px;line-height:1.35}.v042-row span{display:block;margin-top:3px;color:#858c93;font-size:9px;line-height:1.4}.v042-ok{padding:12px;border:1px solid rgba(157,185,170,.2);border-radius:12px;background:rgba(157,185,170,.045);font-size:10px;color:#aeb5ba;line-height:1.5}.v042-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:9px}.v042-stat{padding:10px 11px;border-radius:11px;background:#111417;border:1px solid rgba(255,255,255,.07)}.v042-stat span{display:block;color:#858c93;font-size:8px;font-weight:800;letter-spacing:.09em}.v042-stat strong{display:block;margin-top:4px;font-size:13px}@media(min-width:481px){.v042-grid{grid-template-columns:repeat(4,1fr)}}`;document.head.appendChild(s)}
  function target(){const dash=$("dashboardPage");if(!dash)return null;let p=$("driveV042Panel");if(!p){p=document.createElement("section");p.id="driveV042Panel";p.className="panel v042-panel";p.setAttribute("aria-labelledby","v042-title");const base=$("driveV041Panel");if(base)base.insertAdjacentElement("afterend",p);else dash.querySelector("[aria-labelledby=quick-actions-title]")?.insertAdjacentElement("beforebegin",p)}return p}
  async function refresh(){styles();const panel=target();if(!panel)return;const d=await getData();if(!d.valid.length){panel.innerHTML=`<div class="panel-header"><div><span class="eyebrow">DRIVING BEHAVIOUR</span><h2 id="v042-title">PATTERN WATCH</h2></div><span class="v042-kicker">WAITING</span></div><div class="v042-ok">DRIVE needs at least a few recorded trips before it can confidently identify unusual behaviour.</div>`;return}const status=d.anomalies.length?"ATTENTION":"NORMAL";panel.innerHTML=`<div class="panel-header"><div><span class="eyebrow">DRIVING BEHAVIOUR</span><h2 id="v042-title">PATTERN WATCH</h2></div><span class="v042-kicker">${status}</span></div><div class="v042-grid"><div class="v042-stat"><span>NORMAL TRIP</span><strong>${km(d.avgKm)} km</strong></div><div class="v042-stat"><span>NORMAL TIME</span><strong>${duration(d.avgMs)}</strong></div><div class="v042-stat"><span>NORMAL SPEED</span><strong>${d.avgSpeed?d.avgSpeed.toFixed(0):"—"} km/h</strong></div><div class="v042-stat"><span>PROFILE</span><strong>${esc(d.dominant)}</strong></div></div>${d.anomalies.length?`<div class="v042-list">${d.anomalies.map(x=>`<div class="v042-row"><span class="v042-dot" aria-hidden="true"></span><div><strong>${esc(x)}</strong><span>Compared with your current personal driving baseline.</span></div></div>`).join("")}</div>`:`<div class="v042-ok"><strong>Pattern looks normal.</strong><br>DRIVE has not detected a meaningful difference in your latest recorded drive.</div>`}`}
  function init(){styles();refresh()}
  window.DRIVE_BEHAVIOUR_V042={refresh};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
(function loadVehicleMemory(){if(window.DRIVE_MEMORY||document.querySelector('script[data-drive-memory]'))return;const s=document.createElement("script");s.src=`./vehicle-memory.js?v=${typeof DRIVE_VERSION!=="undefined"?DRIVE_VERSION:"0.44"}`;s.dataset.driveMemory="1";s.onload=()=>window.DRIVE_MEMORY?.refresh?.();s.onerror=e=>console.error("Vehicle Memory module failed",e);document.head.appendChild(s)})();
(function loadComponents(){if(window.DRIVE_COMPONENTS||document.querySelector('script[data-drive-components]'))return;const s=document.createElement("script");s.src=`./components.js?v=${typeof DRIVE_VERSION!=="undefined"?DRIVE_VERSION:"0.46"}`;s.dataset.driveComponents="1";s.onload=()=>window.DRIVE_COMPONENTS?.refresh?.();s.onerror=e=>console.error("Components module failed",e);document.head.appendChild(s)})();
(function loadVehicleHealth(){if(window.DRIVE_HEALTH||document.querySelector('script[data-drive-health]'))return;const s=document.createElement("script");s.src=`./vehicle-health-v048.js?v=${typeof DRIVE_VERSION!=="undefined"?DRIVE_VERSION:"0.48"}`;s.dataset.driveHealth="1";s.onload=()=>window.DRIVE_HEALTH?.refresh?.();s.onerror=e=>console.error("Vehicle Health module failed",e);document.head.appendChild(s)})();
(function loadDriveWatch(){if(window.DRIVE_WATCH||document.querySelector('script[data-drive-watch]'))return;const s=document.createElement("script");s.src=`./drive-watch-v049.js?v=${typeof DRIVE_VERSION!=="undefined"?DRIVE_VERSION:"0.49"}`;s.dataset.driveWatch="1";s.onload=()=>window.DRIVE_WATCH?.refresh?.();s.onerror=e=>console.error("DRIVE WATCH module failed",e);document.head.appendChild(s)})();
(function loadTripPersistence(){if(window.DRIVE_PERSISTENT_TRIP||document.querySelector('script[data-drive-persistence]'))return;const s=document.createElement("script");s.src=`./trip-persistence-v051.js?v=${Date.now()}`;s.dataset.drivePersistence="1";s.onload=()=>window.DRIVE_PERSISTENT_TRIP?.recover?.();s.onerror=e=>console.error("Trip persistence module failed",e);document.head.appendChild(s)})();
