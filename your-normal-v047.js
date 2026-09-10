/* DRIVE v0.47 — YOUR NORMAL 2.0 */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const money=v=>`P${Number(v||0).toFixed(2)}`;
  const num=(v,d=1)=>Number(v||0).toFixed(d);
  const median=values=>{const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
  const vehicleFilter=(rows,id)=>rows.filter(r=>!id||r.vehicleId==null||String(r.vehicleId)===String(id));
  const dateOf=r=>new Date(r?.date||r?.startTime||r?.createdAt||0);

  async function collect(){
    const vehicle=typeof getActiveVehicle==="function"?await getActiveVehicle():null;
    if(!vehicle)return null;
    const [fuel,trips,maintenance,expenses]=await Promise.all(["fuel","trips","maintenance","expenses"].map(getAllRecords));
    const id=vehicle.id;
    const f=vehicleFilter(fuel,id).filter(r=>Number(r.litres)>0&&Number(r.cost)>=0);
    const t=vehicleFilter(trips,id).filter(r=>Number(r.distance)>0);
    const m=vehicleFilter(maintenance,id).filter(r=>Number(r.odometer)>=0);
    const e=vehicleFilter(expenses,id);

    const economySegments=f.filter(r=>Number(r.distance)>0).map(r=>({economy:Number(r.economy)>0?Number(r.economy):Number(r.litres)/Number(r.distance)*100,distance:Number(r.distance),litres:Number(r.litres),cost:Number(r.cost)})).filter(r=>r.economy>0&&r.economy<100);
    const totalLitres=economySegments.reduce((s,r)=>s+r.litres,0),totalFuelDistance=economySegments.reduce((s,r)=>s+r.distance,0),totalFuelCost=economySegments.reduce((s,r)=>s+r.cost,0);
    const economy=totalFuelDistance>0?totalLitres/totalFuelDistance*100:null;
    const fuelPrice=totalLitres>0?totalFuelCost/totalLitres:null;
    const tripDistances=t.map(r=>Number(r.distance)).filter(v=>v>0),tripDurations=t.map(r=>Number(r.duration)).filter(v=>v>0);
    const tripSpeeds=t.map(r=>{const d=Number(r.distance),ms=Number(r.duration);return d>0&&ms>0?d/(ms/3600000):null}).filter(v=>v>0&&v<180);
    const serviceOdometers=m.map(r=>Number(r.odometer)).filter(v=>v>0).sort((a,b)=>a-b);
    const serviceGaps=serviceOdometers.slice(1).map((v,i)=>v-serviceOdometers[i]).filter(v=>v>0&&v<50000);
    const totalMaintenance=m.reduce((s,r)=>s+Number(r.cost||0),0),totalExpenses=e.reduce((s,r)=>s+Number(r.amount||r.cost||0),0);
    const totalRecordedSpend=totalFuelCost+totalMaintenance+totalExpenses;
    const distanceForCost=totalFuelDistance>0?totalFuelDistance:tripDistances.reduce((s,v)=>s+v,0);
    return {vehicle,fuel:f,trips:t,maintenance:m,expenses:e,economySegments,economy,fuelPrice,tripDistance:median(tripDistances),tripDuration:median(tripDurations),tripSpeed:median(tripSpeeds),serviceInterval:median(serviceGaps),serviceSamples:serviceGaps.length,totalRecordedSpend,distanceForCost,costPerKm:distanceForCost>0?totalRecordedSpend/distanceForCost:null};
  }

  function styles(){
    if($("yourNormalStyles"))return;
    const s=document.createElement("style");s.id="yourNormalStyles";s.textContent=`.your-normal{margin-top:10px}.your-normal-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:13px}.your-normal-header span{display:block;color:var(--muted);font-size:8px;font-weight:900;letter-spacing:.12em}.your-normal-header h2{margin:5px 0 0;font-size:22px;letter-spacing:-.03em}.your-normal-confidence{padding:5px 7px;border:1px solid var(--line);border-radius:7px;color:var(--muted);font-size:8px;font-weight:900;letter-spacing:.08em;white-space:nowrap}.your-normal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.your-normal-stat{padding:12px;border:1px solid var(--line);border-radius:13px;background:var(--surface)}.your-normal-stat span{display:block;color:var(--muted);font-size:8px;font-weight:900;letter-spacing:.08em}.your-normal-stat strong{display:block;margin-top:6px;font-size:16px;letter-spacing:-.02em}.your-normal-stat small{display:block;margin-top:3px;color:var(--muted);font-size:8px;line-height:1.3}.your-normal-note{margin-top:8px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.018);color:var(--muted);font-size:9px;line-height:1.45}.your-normal-note strong{color:inherit}.your-normal-learning{padding:13px;border:1px dashed var(--line);border-radius:13px;color:var(--muted);font-size:10px;line-height:1.45}.your-normal-learning strong{display:block;color:var(--text,#f1f3f4);font-size:11px;margin-bottom:4px}.your-normal-signal{margin-top:8px;display:grid;gap:6px}.your-normal-signal div{padding:9px 10px;border-radius:10px;background:var(--surface);border:1px solid var(--line);font-size:9px;line-height:1.35}.your-normal-signal b{display:block;color:var(--text,#f1f3f4);font-size:9px;margin-bottom:2px}@media(min-width:681px){.your-normal-grid{grid-template-columns:repeat(4,1fr)}}`;
    document.head.appendChild(s);
  }

  function mount(){
    styles();
    const view=$("analyticsView");if(!view)return null;
    let panel=$("yourNormalPanel");
    if(!panel){panel=document.createElement("section");panel.id="yourNormalPanel";panel.className="analytics-panel your-normal";const kpis=$("analyticsKpis");if(kpis)kpis.insertAdjacentElement("afterend",panel);else view.insertAdjacentElement("afterbegin",panel)}
    return panel;
  }

  function stat(label,value,detail){return `<div class="your-normal-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></div>`}

  function render(data){
    const panel=mount();if(!panel||!data)return;
    const samples={fuel:data.economySegments.length,trips:data.trips.length,service:data.serviceSamples};
    const score=Math.min(100,Math.round((Math.min(samples.fuel,6)/6*40)+(Math.min(samples.trips,8)/8*35)+(Math.min(samples.service,4)/4*25)));
    const confidence=score>=75?"ESTABLISHED":score>=40?"LEARNING":"BUILDING";
    const fuelText=data.economy?`${num(data.economy,2)} L/100 KM`:"—";
    const priceText=data.fuelPrice?money(data.fuelPrice)+" / L":"—";
    const tripText=data.tripDistance?`${num(data.tripDistance,1)} km`:"—";
    const speedText=data.tripSpeed?`${num(data.tripSpeed,0)} km/h`:"—";
    const serviceText=data.serviceInterval?`${Math.round(data.serviceInterval).toLocaleString()} km`:"—";
    const costText=data.costPerKm?money(data.costPerKm):"—";
    const signals=[];
    const latestFuel=[...data.economySegments].at(-1);
    if(latestFuel&&data.economy){const diff=(latestFuel.economy-data.economy)/data.economy*100;if(Math.abs(diff)>=10)signals.push(`<b>Fuel pattern</b>Your latest measured economy is ${Math.abs(diff).toFixed(0)}% ${diff>0?"higher":"lower"} than your normal.`)}
    const latestTrip=[...data.trips].sort((a,b)=>dateOf(b)-dateOf(a))[0];
    if(latestTrip&&data.tripDistance){const diff=(Number(latestTrip.distance)-data.tripDistance)/data.tripDistance*100;if(Math.abs(diff)>=20)signals.push(`<b>Trip pattern</b>Your latest drive was ${Math.abs(diff).toFixed(0)}% ${diff>0?"longer":"shorter"} than your normal trip.`)}
    if(data.serviceInterval&&data.vehicle.odometer){const lastService=[...data.maintenance].sort((a,b)=>Number(b.odometer||0)-Number(a.odometer||0))[0];if(lastService&&Number(lastService.odometer)>0){const since=Number(data.vehicle.odometer)-Number(lastService.odometer);if(since>data.serviceInterval*.9)signals.push(`<b>Service pattern</b>You are around ${Math.max(0,Math.round(since)).toLocaleString()} km since the last recorded service.`)}}
    panel.innerHTML=`<div class="your-normal-header"><div><span>PERSONAL BASELINE</span><h2 id="your-normal-title">YOUR NORMAL</h2></div><span class="your-normal-confidence">${confidence}</span></div>${score<40?`<div class="your-normal-learning"><strong>DRIVE is still learning this vehicle.</strong>Record a few more fuel entries, drives and services and the baseline will become more useful. Nothing here uses a generic manufacturer target.</div>`:`<div class="your-normal-grid">${stat("FUEL ECONOMY",fuelText,"Your measured baseline")}${stat("FUEL PRICE",priceText,"Weighted from your entries")}${stat("TYPICAL DRIVE",tripText,"Median recorded distance")}${stat("NORMAL SPEED",speedText,"Median recorded average speed")}${stat("SERVICE INTERVAL",serviceText,"Median service-to-service gap")}${stat("RECORDED COST / KM",costText,"Fuel + service + expenses")}${stat("FUEL SAMPLES",String(samples.fuel),"Measured fuel segments")}${stat("DRIVE SAMPLES",String(samples.trips),"Recorded trips")}</div>`}${signals.length?`<div class="your-normal-signal">${signals.map(x=>`<div>${x}</div>`).join("")}</div>`:`<div class="your-normal-note">No meaningful deviation detected from your current personal baseline.</div>`}<div class="your-normal-note">Baseline confidence: ${score}% · DRIVE learns from this vehicle's recorded history and does not invent missing data.</div>`;
  }

  async function refresh(){try{const data=await collect();if(data)render(data)}catch(e){console.error("YOUR NORMAL failed",e)}}
  function init(){styles();if($("analyticsView"))refresh()}
  window.DRIVE_YOUR_NORMAL={refresh};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
