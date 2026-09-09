/* DRIVE v0.35 — Fuel Intelligence 2.0 */
(function(){
'use strict';
const active=async()=>typeof getActiveVehicle==='function'?await getActiveVehicle():null;
const all=async s=>typeof getAllRecords==='function'?await getAllRecords(s):[];
const valid=n=>Number.isFinite(Number(n));
const km=r=>Math.max(0,Number(r?.distance)||0);
const fuelEconomy=r=>{const l=Number(r?.litres),d=km(r);return l>0&&d>0?l/d*100:null};
function filter(a,id){return a.filter(r=>!id||r.vehicleId==null||r.vehicleId===id)}
function median(a){if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
function mount(){if(document.getElementById('fuelIntelligenceV2'))return;const anchor=document.getElementById('usageIntelligence')||document.getElementById('costIntelligence')||document.getElementById('driveBriefing');if(!anchor)return;const host=document.createElement('section');host.id='fuelIntelligenceV2';host.className='panel fuel-intelligence-v2';host.setAttribute('aria-labelledby','fuel-intelligence-v2-title');anchor.insertAdjacentElement('afterend',host);const style=document.createElement('style');style.id='drive-v035-fuel-style';style.textContent=`.fuel-intelligence-v2{margin-top:18px}.intel-fuel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}.intel-fuel-head h3{margin:5px 0 0;font-size:18px;letter-spacing:-.02em}.intel-fuel-state{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.intel-fuel-state.watch{color:var(--warning)}.intel-fuel-state.positive{color:var(--accent)}.intel-fuel-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.intel-fuel-grid>div{padding:13px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}.intel-fuel-grid span{display:block;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.intel-fuel-grid strong{display:block;margin-top:6px;font-size:17px;letter-spacing:-.02em}.intel-fuel-comparison{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.intel-fuel-comparison>div{padding:12px;border:1px solid var(--line);border-radius:12px}.intel-fuel-comparison strong{display:block;font-size:13px}.intel-fuel-comparison span{display:block;margin-top:4px;color:var(--muted);font-size:11px;line-height:1.4}.intel-fuel-note{margin:12px 0 0;color:var(--muted);font-size:11px;line-height:1.5}@media(max-width:600px){.intel-fuel-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.intel-fuel-comparison{grid-template-columns:1fr}.intel-fuel-head{display:block}.intel-fuel-state{display:block;margin-top:8px}}`;document.head.appendChild(style)}
async function analyse(){
 const v=await active(),id=v?.id;
 const [rawFuel,rawTrips]=await Promise.all([all('fuel'),all('trips')]);
 const fuel=filter(rawFuel,id).filter(r=>Number(r.litres)>0&&Number(r.cost)>=0);
 const trips=filter(rawTrips,id).filter(r=>km(r)>0);
 const economies=fuel.map(fuelEconomy).filter(valid);
 const baseline=median(economies.slice(-Math.min(12,economies.length)));
 const recentValues=economies.slice(-3),recentEconomy=recentValues.length?recentValues.reduce((a,b)=>a+b,0)/recentValues.length:null;
 const economyDelta=baseline&&recentEconomy!=null?(recentEconomy-baseline)/baseline:null;
 const totalLitres=fuel.reduce((s,r)=>s+Number(r.litres||0),0),totalFuelCost=fuel.reduce((s,r)=>s+Number(r.cost||0),0),totalDistance=trips.reduce((s,r)=>s+km(r),0);
 const avgPrice=totalLitres?totalFuelCost/totalLitres:null;
 const recentTrips=trips.slice(-5),short=recentTrips.filter(r=>km(r)<5).length,shortRatio=recentTrips.length?short/recentTrips.length:null;
 const usage=window.DRIVE_USAGE_LAST||null;
 let signal='';let state='';
 if(economyDelta!=null&&economyDelta>.12){state='watch';signal='Consumption above baseline'}
 else if(economyDelta!=null&&economyDelta<-.08){state='positive';signal='Efficiency improving'}
 else if(shortRatio!=null&&shortRatio>=.6){state='watch';signal='Short-trip pattern detected'}
 else signal='Fuel pattern stable';
 return{vehicle:v,fuel,trips,economies,baseline,recentEconomy,economyDelta,totalLitres,totalFuelCost,totalDistance,avgPrice,recentTrips,shortRatio,usage,state,signal};
}
function render(r){mount();const host=document.getElementById('fuelIntelligenceV2');if(!host)return;const economy=r.recentEconomy!=null?`${r.recentEconomy.toFixed(2)} L/100`:'—';const delta=r.economyDelta!=null?`${r.economyDelta>0?'+':''}${(r.economyDelta*100).toFixed(1)}% vs baseline`:'Baseline building';const fuelPerKm=r.totalDistance>0?r.totalFuelCost/r.totalDistance:null;const shortNote=r.shortRatio!=null&&r.shortRatio>=.6?'Most of your last five recorded drives were under 5 km. DRIVE will watch whether this pattern persists alongside consumption.':r.economyDelta!=null&&r.economyDelta>.12?'Recent consumption is materially above your personal baseline. DRIVE is treating this as a trend signal, not a mechanical diagnosis.':r.economyDelta!=null&&r.economyDelta<-.08?'Recent consumption is better than your personal baseline. That is a positive efficiency signal.':'Fuel consumption is currently close to your personal baseline.';host.innerHTML=`<div class="intel-fuel-head"><div><span class="eyebrow">FUEL INTELLIGENCE 2.0</span><h3 id="fuel-intelligence-v2-title">Fuel efficiency in context</h3></div><span class="intel-fuel-state ${r.state}">${r.signal}</span></div><div class="intel-fuel-grid"><div><span>Recent economy</span><strong>${economy}</strong></div><div><span>Personal baseline</span><strong>${r.baseline!=null?r.baseline.toFixed(2)+' L/100':'—'}</strong></div><div><span>Fuel price</span><strong>${r.avgPrice!=null?'P'+r.avgPrice.toFixed(2)+'/L':'—'}</strong></div><div><span>Fuel cost / km</span><strong>${fuelPerKm!=null?'P'+fuelPerKm.toFixed(2):'—'}</strong></div></div><div class="intel-fuel-comparison"><div><strong>${delta}</strong><span>Based on your most recent recorded fuel economy.</span></div><div><strong>${r.totalLitres.toFixed(1)} L recorded</strong><span>${r.totalFuelCost?'P'+r.totalFuelCost.toFixed(2):'—'} across recorded fuel entries.</span></div></div><p class="intel-fuel-note">${shortNote}</p>`}
async function refresh(){try{const r=await analyse();window.DRIVE_FUEL_V2_LAST=r;render(r);return r}catch(e){console.error('DRIVE fuel intelligence 2.0 failed',e)}}
window.DRIVE_FUEL_V2={analyse,refresh};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
window.addEventListener('drive:datachanged',refresh);
})();
