/* DRIVE v0.48 — Vehicle Health Score */
(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const vehicleOnly=(rows,v)=>rows.filter(r=>!v?.id||r.vehicleId==null||String(r.vehicleId)===String(v.id));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const median=values=>{const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
  const dateOf=r=>new Date(r?.date||r?.startTime||r?.createdAt||0);

  async function collect(){
    const vehicle=typeof getActiveVehicle==="function"?await getActiveVehicle():null;
    if(!vehicle)return null;
    const [fuel,trips,maintenance,components]=await Promise.all([
      getAllRecords("fuel"),getAllRecords("trips"),getAllRecords("maintenance"),
      window.DRIVE_COMPONENTS?.list?window.DRIVE_COMPONENTS.list():Promise.resolve([])
    ]);
    const f=vehicleOnly(fuel,vehicle).filter(r=>Number(r.litres)>0&&Number(r.distance)>0);
    const t=vehicleOnly(trips,vehicle).filter(r=>Number(r.distance)>0);
    const m=vehicleOnly(maintenance,vehicle).filter(r=>Number(r.odometer)>0);
    const c=vehicleOnly(components,vehicle);
    const economy=f.map(r=>Number(r.economy)>0?Number(r.economy):Number(r.litres)/Number(r.distance)*100).filter(v=>v>0&&v<100);
    const normal=window.DRIVE_YOUR_NORMAL;
    let baseline=null;
    if(economy.length)baseline=median(economy);
    const latestFuel=f.slice().sort((a,b)=>dateOf(b)-dateOf(a))[0];
    const latestFuelEconomy=latestFuel?(Number(latestFuel.economy)>0?Number(latestFuel.economy):Number(latestFuel.litres)/Number(latestFuel.distance)*100):null;
    const serviceOdo=m.map(r=>Number(r.odometer)).sort((a,b)=>b-a);
    const lastServiceOdo=serviceOdo[0]||null;
    const serviceGaps=serviceOdo.slice(1).map((v,i)=>serviceOdo[i]-v).filter(v=>v>0&&v<50000);
    const normalService=median(serviceGaps);
    const sinceService=lastServiceOdo?Math.max(0,Number(vehicle.odometer||0)-lastServiceOdo):null;
    const needsAttention=c.filter(x=>String(x.status||"").toLowerCase()==="needs attention").length;
    const removed=c.filter(x=>String(x.status||"").toLowerCase()==="removed").length;
    const active=c.filter(x=>String(x.status||"").toLowerCase()==="active").length;
    const recentMaintenance=m.filter(r=>(Date.now()-dateOf(r).getTime())<=365*86400000).length;
    const serviceCoverage=lastServiceOdo?clamp((sinceService<=Math.max(normalService||15000,15000)?1:Math.max(0,1-(sinceService-Math.max(normalService||15000,15000))/15000)),0,1):m.length?0.7:0.35;
    const componentScore=c.length?clamp(100-(needsAttention*22)-(removed*8),0,100):70;
    const maintenanceScore=clamp(45+(recentMaintenance?Math.min(25,recentMaintenance*8):0)+(m.length?20:0)+(lastServiceOdo?15:0),0,100)*0.55+serviceCoverage*45;
    const fuelScore=baseline&&latestFuelEconomy?clamp(100-Math.min(45,Math.abs(latestFuelEconomy-baseline)/baseline*100*1.5),55,100):70;
    const drivingScore=t.length>=3?clamp(92-Math.max(0,(t.length?0:0)),65,100):t.length?80:65;
    const mileageScore=Number(vehicle.odometer)>0?clamp(100-(Number(vehicle.odometer)/400000*20),70,100):75;
    const score=Math.round(maintenanceScore*.35+componentScore*.30+fuelScore*.15+drivingScore*.10+mileageScore*.10);
    const confidence=Math.round(clamp((Math.min(m.length,5)/5*35)+(Math.min(c.length,6)/6*25)+(Math.min(f.length,6)/6*20)+(Math.min(t.length,8)/8*20),10,100));
    const status=score>=85?"GOOD":score>=70?"WATCH":score>=50?"ATTENTION":"CRITICAL";
    const reasons=[];
    if(needsAttention)reasons.push(`${needsAttention} component${needsAttention===1?"":"s"} marked Needs Attention`);
    if(normalService&&sinceService>normalService)reasons.push(`${Math.round(sinceService).toLocaleString()} km since the last recorded service`);
    if(latestFuelEconomy&&baseline&&Math.abs(latestFuelEconomy-baseline)/baseline>=.15)reasons.push(`recent fuel economy is ${Math.round(Math.abs(latestFuelEconomy-baseline)/baseline*100)}% outside your baseline`);
    if(!m.length)reasons.push("limited maintenance history");
    return {vehicle,fuel:f,trips:t,maintenance:m,components:c,score,status,confidence,reasons,latestFuelEconomy,baseline,needsAttention,sinceService,normalService};
  }

  function styles(){
    if($("driveHealthStyles"))return;
    const s=document.createElement("style");s.id="driveHealthStyles";s.textContent=`.drive-health-detail{margin-top:10px}.drive-health-detail .health-score-head{display:flex;justify-content:space-between;align-items:end;gap:12px}.drive-health-detail .health-score-head span{display:block;color:var(--muted);font-size:8px;font-weight:900;letter-spacing:.12em}.drive-health-detail .health-score-head strong{display:block;margin-top:5px;font-size:34px;letter-spacing:-.05em}.drive-health-status{font-size:9px;font-weight:900;letter-spacing:.1em}.drive-health-bar{height:5px;margin-top:12px;border-radius:8px;background:rgba(255,255,255,.07);overflow:hidden}.drive-health-bar i{display:block;height:100%;width:0;background:var(--accent);border-radius:inherit;transition:width .45s ease}.drive-health-meta{display:flex;justify-content:space-between;gap:10px;margin-top:7px;color:var(--muted);font-size:8px}.drive-health-reasons{display:grid;gap:6px;margin-top:10px}.drive-health-reason{padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font-size:9px;line-height:1.35}.drive-health-reason strong{display:block;font-size:9px;margin-bottom:2px}.drive-health-note{margin-top:8px;color:var(--muted);font-size:8px;line-height:1.4}@media(min-width:681px){.drive-health-reasons{grid-template-columns:repeat(3,1fr)}}`;
    document.head.appendChild(s);
  }

  function render(data){
    styles();
    const host=$("health-title")?.closest(".panel");
    if(!host||!data)return;
    const score=$("healthScore"),bar=$("healthBar"),status=host.querySelector(".health-status"),progress=host.querySelector(".health-bar");
    if(score)score.textContent=data.score;
    if(bar)bar.style.width=`${data.score}%`;
    if(status)status.textContent=data.status;
    if(progress)progress.setAttribute("aria-valuenow",String(data.score));
    let detail=$("driveHealthDetail");
    if(!detail){detail=document.createElement("div");detail.id="driveHealthDetail";detail.className="drive-health-detail";host.appendChild(detail)}
    const confidence=data.confidence>=75?"ESTABLISHED":data.confidence>=40?"LEARNING":"BUILDING";
    const reasons=data.reasons.slice(0,3);
    detail.innerHTML=`<div class="health-score-head"><div><span>RECORDED VEHICLE HEALTH</span><strong>${data.score}<small>/100</small></strong></div><span class="drive-health-status">${esc(confidence)}</span></div><div class="drive-health-bar" aria-hidden="true"><i style="width:${data.score}%"></i></div><div class="drive-health-meta"><span>Confidence ${data.confidence}%</span><span>${data.components.length} components · ${data.maintenance.length} services</span></div>${reasons.length?`<div class="drive-health-reasons">${reasons.map((r,i)=>`<div class="drive-health-reason"><strong>${i===0?"PRIMARY SIGNAL":"SIGNAL"}</strong>${esc(r)}</div>`).join("")}</div>`:`<div class="drive-health-reason"><strong>NO ACTIVE SIGNAL</strong>Recorded data is not showing a significant health concern right now.</div>`}<div class="drive-health-note">This is a DRIVE data-health score, not a mechanical diagnosis. It becomes more reliable as your own maintenance, component, fuel and driving history grows.</div>`;
  }

  async function refresh(){try{const data=await collect();if(data)render(data)}catch(e){console.error("Vehicle Health failed",e)}}
  window.DRIVE_HEALTH={refresh};
  window.addEventListener("drive:datachanged",()=>setTimeout(refresh,20));
  function init(){styles();setTimeout(refresh,150)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
