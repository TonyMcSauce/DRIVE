/* DRIVE v0.33 — Vehicle Cost Intelligence */
(function(){
'use strict';
const active=async()=>typeof getActiveVehicle==='function'?await getActiveVehicle():null;
const all=async s=>typeof getAllRecords==='function'?await getAllRecords(s):[];
const key=d=>{const x=new Date(d);return Number.isNaN(x.getTime())?null:`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`};
const money=n=>Number.isFinite(n)?`P${n.toFixed(2)}`:'—';
async function analyse(){
 const v=await active(),id=v?.id;
 const [fuel,expenses,maintenance,trips]=await Promise.all([all('fuel'),all('expenses'),all('maintenance'),all('trips')]);
 const filter=a=>a.filter(r=>!id||r.vehicleId==null||r.vehicleId===id),f=filter(fuel),e=filter(expenses),m=filter(maintenance),t=filter(trips);
 const months={};
 const add=(date,cost,type)=>{const k=key(date),n=Number(cost);if(!k||!Number.isFinite(n)||n<0)return;months[k]??={fuel:0,expenses:0,maintenance:0,total:0};months[k][type]+=n;months[k].total+=n};
 f.forEach(r=>add(r.date||r.createdAt,r.cost,'fuel'));e.forEach(r=>add(r.date||r.createdAt,r.amount,'expenses'));m.forEach(r=>add(r.date||r.createdAt,r.cost,'maintenance'));
 const ordered=Object.keys(months).sort(),currentKey=key(new Date()),current=months[currentKey]||{fuel:0,expenses:0,maintenance:0,total:0},previous=ordered.length>1?months[ordered[ordered.length-2]]:null;
 const change=previous?.total>0?(current.total-previous.total)/previous.total:null;
 const distance=t.reduce((s,r)=>s+Math.max(0,Number(r.distance)||0),0),totalSpend=f.reduce((s,r)=>s+Math.max(0,Number(r.cost)||0),0)+e.reduce((s,r)=>s+Math.max(0,Number(r.amount)||0),0)+m.reduce((s,r)=>s+Math.max(0,Number(r.cost)||0),0);
 return{vehicle:v,current,previous,change,months:ordered,distance,totalSpend,costPerKm:distance?totalSpend/distance:null};
}
function render(r){const host=document.getElementById('costIntelligence');if(!host)return;const trend=r.change==null?'Building baseline':`${r.change>0?'+':''}${(r.change*100).toFixed(0)}% vs previous month`,state=r.change>0.1?'watch':r.change<-0.1?'positive':'';host.innerHTML=`<div class="intel-cost-head"><div><span class="eyebrow">COST INTELLIGENCE</span><h3>What the car is costing you</h3></div><span class="intel-state ${state}">${trend}</span></div><div class="intel-cost-grid"><div><span>This month</span><strong>${money(r.current.total)}</strong></div><div><span>Fuel</span><strong>${money(r.current.fuel)}</strong></div><div><span>Other</span><strong>${money(r.current.expenses+r.current.maintenance)}</strong></div><div><span>Cost / km</span><strong>${r.costPerKm==null?'—':money(r.costPerKm)}</strong></div></div><div class="intel-cost-bar"><span style="width:${r.current.total?Math.min(100,r.current.fuel/r.current.total*100):0}%"></span></div><p class="intel-cost-note">${r.distance?`${r.distance.toFixed(0)} km recorded across ${r.months.length} spending month${r.months.length===1?'':'s'}.`:'Keep recording drives and expenses to build your personal running-cost baseline.'}</p>`}
async function refresh(){try{const r=await analyse();window.DRIVE_COST_LAST=r;render(r);return r}catch(e){console.error('DRIVE cost intelligence failed',e)}}
window.DRIVE_COST={analyse,refresh};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
window.addEventListener('drive:datachanged',refresh);
})();
