/* DRIVE v0.50 — central intelligence engine */
(() => {
  "use strict";
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const fmtKm=v=>`${Number(v||0).toFixed(1)} km`;
  const fmtMoney=v=>`P${Number(v||0).toFixed(2)}`;
  function target(){return document.getElementById("driveBriefing")}
  async function analyze(){
    const data=await window.DRIVE_DATA.intelligence();
    const signals=[];
    const watch=window.DRIVE_WATCH?.collect?.();
    const fuel=data.fuel.filter(r=>Number(r.litres)>0&&Number(r.distance)>0);
    const trips=data.trips.filter(r=>Number(r.distance)>0);
    const maintenance=data.maintenance.filter(r=>Number(r.cost||0)>=0);
    if(fuel.length<3&&trips.length<3){signals.push({severity:"positive",title:"Building your baseline",text:"Keep logging fuel and drives. DRIVE will learn what is normal for this vehicle from your own history.",evidence:`${fuel.length} fuel records · ${trips.length} recorded drives`})}
    if(data.metrics.fuelPrice!=null&&fuel.length>=2){signals.push({severity:"positive",title:"Fuel baseline available",text:`Your recorded fuel price is ${fmtMoney(data.metrics.fuelPrice)} per litre.`,evidence:`${fuel.length} measured fuel entries`})}
    if(trips.length){const latest=[...trips].sort((a,b)=>new Date(b.startTime||b.createdAt)-new Date(a.startTime||a.createdAt))[0];signals.push({severity:"positive",title:"Latest drive recorded",text:`Your most recent recorded drive covered ${fmtKm(latest.distance)}.`,evidence:`${Math.round(Number(latest.duration||0)/60000)} min recorded duration`})}
    if(maintenance.length){const latest=[...maintenance].sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt))[0];signals.push({severity:"positive",title:"Maintenance history connected",text:`Your latest service record is available to the intelligence engine.`,evidence:`${latest.title||latest.description||"Service record"}`})}
    return {data,signals,watch:watch||null,confidence:fuel.length>=5&&trips.length>=5?"ESTABLISHED":fuel.length||trips.length?"LEARNING":"BUILDING"};
  }
  async function refresh(){const panel=target();if(!panel||!window.DRIVE_DATA?.intelligence)return;try{const result=await analyze();const watchSignals=result.watch?.watch||[];const combined=[...watchSignals.filter(x=>x.severity==="attention"||x.severity==="watch"),...result.signals];const unique=combined.filter((x,i,a)=>a.findIndex(y=>y.title===x.title)===i).slice(0,2);const confidence=result.confidence;panel.querySelector(".briefing-confidence")?.replaceChildren(document.createTextNode(confidence));const list=panel.querySelector(".briefing-list");if(!list)return;list.innerHTML=unique.map(x=>`<article class="briefing-item severity-${esc(x.severity)}"><div class="briefing-title"><strong>${esc(x.title)}</strong><span>${esc(x.severity).toUpperCase()}</span></div><p>${esc(x.text||x.detail)}</p><small>${esc(x.evidence||"")}</small></article>`).join("")||`<div class="briefing-empty"><strong>No immediate insight</strong><p>DRIVE is monitoring your vehicle history and will surface something when the recorded evidence supports it.</p></div>`}catch(error){console.error("DRIVE intelligence engine failed",error)}}
  window.DRIVE_INTELLIGENCE={analyze,refresh};
  window.addEventListener("drive:datachanged",()=>window.DRIVE_INTELLIGENCE?.refresh?.());
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh,{once:true});else refresh();
})();
