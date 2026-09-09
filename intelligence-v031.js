/* DRIVE v0.31 — Personal Baseline Intelligence */
(()=>{
"use strict";
const active=()=>typeof getActiveVehicle==='function'?getActiveVehicle():null;
const rows=async s=>{const v=await active();return(await getAllRecords(s)).filter(r=>!v?.id||r.vehicleId==null||String(r.vehicleId)===String(v.id))};
const nums=(a,k,min=0,max=Infinity)=>a.map(r=>Number(r[k])).filter(v=>Number.isFinite(v)&&v>min&&v<max);
const median=a=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),i=Math.floor(b.length/2);return b.length%2?b[i]:(b[i-1]+b[i])/2};
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const pct=(current,normal)=>normal&&Number.isFinite(current)?(current-normal)/normal*100:null;
async function analyse(){
 const [fuel,trips,maintenance,expenses]=await Promise.all([rows('fuel'),rows('trips'),rows('maintenance'),rows('expenses')]);
 const economy=nums(fuel,'economy',0,40), distance=nums(trips,'distance',0,100000), duration=nums(trips,'duration',0,86400000).map(v=>v/3600000), speed=trips.map(r=>Number(r.averageSpeed)).filter(v=>Number.isFinite(v)&&v>0&&200>v);
 const monthly={};[...fuel.map(r=>({date:r.date,cost:r.cost})),...maintenance.map(r=>({date:r.date,cost:r.cost})),...expenses.map(r=>({date:r.date,cost:r.cost}))].forEach(r=>{const m=String(r.date||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))monthly[m]=(monthly[m]||0)+Number(r.cost||0)});
 const monthKeys=Object.keys(monthly).sort(),monthValues=monthKeys.map(k=>monthly[k]),normalMonthly=monthValues.length?avg(monthValues.slice(-3)):null;
 const normal={fuelEconomy:median(economy),tripDistance:median(distance),tripDuration:median(duration),tripSpeed:median(speed),monthlyCost:normalMonthly};
 const recentFuel=economy.slice(-3),recentTrips=trips.slice(-3),current={fuelEconomy:avg(recentFuel),tripDistance:avg(nums(recentTrips,'distance',0,100000)),tripDuration:avg(nums(recentTrips,'duration',0,86400000).map(v=>v/3600000)),tripSpeed:avg(recentTrips.map(r=>Number(r.averageSpeed)).filter(v=>Number.isFinite(v)&&v>0&&v<200)),monthlyCost:monthValues.at(-1)??null};
 const deviations={fuelEconomy:pct(current.fuelEconomy,normal.fuelEconomy),tripDistance:pct(current.tripDistance,normal.tripDistance),tripDuration:pct(current.tripDuration,normal.tripDuration),tripSpeed:pct(current.tripSpeed,normal.tripSpeed),monthlyCost:pct(current.monthlyCost,normal.monthlyCost)};
 const serviceIntervals=maintenance.map(r=>Number(r.intervalKm)).filter(v=>Number.isFinite(v)&&v>0),normalServiceKm=median(serviceIntervals);
 const sampleScore=Math.min(100,economy.length*10+trips.length*6+maintenance.length*10+monthValues.length*4);
 const confidence=sampleScore>=70?'HIGH':sampleScore>=35?'MEDIUM':'BUILDING';
 return{normal,current,deviations,service:{normalKm:normalServiceKm,records:maintenance.length},samples:{fuel:economy.length,trips:trips.length,maintenance:maintenance.length,months:monthValues.length},confidence};
}
function state(dev){if(dev==null)return{label:'BUILDING',tone:'neutral'};const n=Math.abs(dev);return n<8?{label:'NORMAL',tone:'ok'}:n<15?{label:'WATCH',tone:'watch'}:{label:'ATTENTION',tone:'attention'}}
function render(r){const target=document.getElementById('vehicleMemory');if(!target)return;const c=v=>v==null?'—':`${v>0?'+':''}${v.toFixed(0)}%`;const metric=(name,value,deviation,note)=>{const s=state(deviation);return `<article class="intel-baseline-card"><div><span>${name}</span><b class="intel-state ${s.tone}">${s.label}</b></div><strong>${value}</strong><small>${note}${deviation!=null?` · ${c(deviation)} vs normal`:''}</small></article>`};
 const rFuel=r.normal.fuelEconomy?`${r.normal.fuelEconomy.toFixed(1)} L/100 km`:'—',rTrip=r.normal.tripDistance?`${r.normal.tripDistance.toFixed(1)} km`:'—',rCost=r.normal.monthlyCost!=null?`P${r.normal.monthlyCost.toFixed(0)}`:'—',rService=r.service.normalKm?`${r.service.normalKm.toLocaleString()} km`:'—';
 target.innerHTML=`<div class="panel-header"><div><span class="eyebrow">PERSONAL BASELINES</span><h2>YOUR NORMAL</h2></div><span class="briefing-confidence">${r.confidence}</span></div><div class="intel-baseline-grid">${metric('FUEL ECONOMY',rFuel,r.deviations.fuelEconomy,'Personal median')} ${metric('TYPICAL DRIVE',rTrip,r.deviations.tripDistance,'Personal median distance')} ${metric('MONTHLY RUNNING COST',rCost,r.deviations.monthlyCost,'Recent 3-month average')} ${metric('SERVICE INTERVAL',rService,null,r.service.records?'Based on recorded intervals':'Record repeated services')}</div><div class="intel-current"><div><span>CURRENT STATE</span><strong>${state(r.deviations.fuelEconomy).label==='ATTENTION'?'Fuel use is outside your normal range':state(r.deviations.fuelEconomy).label==='WATCH'?'Fuel use is drifting from your normal':'Vehicle patterns are within your normal range'}</strong></div><div><span>WHY</span><strong>${r.samples.fuel>=3?`${r.samples.fuel} fuel samples establish the comparison baseline`:'More fuel history is needed to establish a strong baseline'}</strong></div><div><span>ACTION</span><strong>${r.deviations.fuelEconomy!=null&&r.deviations.fuelEconomy>15?'Check the next fuel entry and look for a repeat before investigating further':'Keep logging normally; DRIVE will watch for persistent changes'}</strong></div></div>`;
}
async function refresh(){try{const r=await analyse();render(r);window.DRIVE_PERSONAL_INTEL_LAST=r;return r}catch(e){console.error('DRIVE personal intelligence failed',e)}}
window.DRIVE_PERSONAL_INTEL={analyse,refresh};
document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,700));
window.addEventListener('drive:datachanged',()=>setTimeout(refresh,100));
})();