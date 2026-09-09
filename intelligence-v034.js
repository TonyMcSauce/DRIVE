/* DRIVE v0.34 — Usage Intelligence */
(function(){
'use strict';
const active=async()=>typeof getActiveVehicle==='function'?await getActiveVehicle():null;
const all=async s=>typeof getAllRecords==='function'?await getAllRecords(s):[];
const dateOf=r=>r?.startTime||r?.date||r?.createdAt||null;
const validDate=d=>{const x=new Date(d);return Number.isNaN(x.getTime())?null:x};
const km=r=>Math.max(0,Number(r?.distance)||0);
const key=d=>{const x=validDate(d);return x?`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`:null};
const pct=n=>`${Math.round(n*100)}%`;
function filterVehicle(a,id){return a.filter(r=>!id||r.vehicleId==null||r.vehicleId===id)}
function mount(){if(document.getElementById('usageIntelligence'))return;const anchor=document.getElementById('costIntelligence')||document.getElementById('driveBriefing');if(!anchor)return;const host=document.createElement('section');host.id='usageIntelligence';host.className='panel usage-intelligence';host.setAttribute('aria-labelledby','usage-intelligence-title');anchor.insertAdjacentElement('afterend',host);const style=document.createElement('style');style.id='drive-v034-usage-style';style.textContent=`.usage-intelligence{margin-top:18px}.intel-usage-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}.intel-usage-head h3{margin:5px 0 0;font-size:18px;letter-spacing:-.02em}.intel-usage-state{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.intel-usage-state.watch{color:var(--warning)}.intel-usage-state.positive{color:var(--accent)}.intel-usage-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.intel-usage-grid>div{padding:13px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}.intel-usage-grid span{display:block;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.intel-usage-grid strong{display:block;margin-top:6px;font-size:17px;letter-spacing:-.02em}.intel-usage-detail{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.intel-usage-detail>div{padding:12px;border:1px solid var(--line);border-radius:12px}.intel-usage-detail strong{display:block;font-size:13px}.intel-usage-detail span{display:block;margin-top:4px;color:var(--muted);font-size:11px;line-height:1.4}.intel-usage-note{margin:12px 0 0;color:var(--muted);font-size:11px;line-height:1.5}@media(max-width:600px){.intel-usage-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.intel-usage-detail{grid-template-columns:1fr}.intel-usage-head{display:block}.intel-usage-state{display:block;margin-top:8px}}`;
document.head.appendChild(style)}
async function analyse(){
 const v=await active(),id=v?.id;
 const [rawTrips,rawFuel]=await Promise.all([all('trips'),all('fuel')]);
 const trips=filterVehicle(rawTrips,id).map(r=>({...r,_date:validDate(dateOf(r)),_km:km(r)})).filter(r=>r._date&&r._km>0).sort((a,b)=>a._date-b._date);
 const fuel=filterVehicle(rawFuel,id);
 const totalDistance=trips.reduce((s,r)=>s+r._km,0),tripCount=trips.length;
 const avgTrip=tripCount?totalDistance/tripCount:0;
 const shortTrips=trips.filter(r=>r._km<5).length;
 const longTrips=trips.filter(r=>r._km>=50).length;
 const activeDays=new Set(trips.map(r=>{const d=r._date;return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`})).size;
 const months={};trips.forEach(r=>{const k=key(r._date);if(k)months[k]=(months[k]||0)+r._km});
 const ordered=Object.keys(months).sort();
 const currentKey=key(new Date());
 const currentDistance=months[currentKey]||0;
 const previousKeys=ordered.filter(k=>k<currentKey);
 const previousKey=previousKeys.at(-1);
 const previousDistance=previousKey?months[previousKey]:null;
 const usageChange=previousDistance>0?(currentDistance-previousDistance)/previousDistance:null;
 const recent=trips.slice(-5),prior=trips.slice(-10,-5);
 const recentAvg=recent.length?recent.reduce((s,r)=>s+r._km,0)/recent.length:null;
 const priorAvg=prior.length?prior.reduce((s,r)=>s+r._km,0)/prior.length:null;
 const intensityChange=priorAvg>0?(recentAvg-priorAvg)/priorAvg:null;
 const routeBuckets={};trips.forEach(r=>{const p=Array.isArray(r.points)?r.points.filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lng))):[];if(p.length<2)return;const a=p[0],b=p[p.length-1];const route=`${Number(a.lat).toFixed(2)},${Number(a.lng).toFixed(2)}→${Number(b.lat).toFixed(2)},${Number(b.lng).toFixed(2)}`;routeBuckets[route]=(routeBuckets[route]||0)+1});
 const repeatedRoutes=Object.entries(routeBuckets).filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]);
 const commuteTrips=repeatedRoutes.length?repeatedRoutes.reduce((s,[,n])=>s+n,0):0;
 const shortRatio=tripCount?shortTrips/tripCount:0;
 let state='';let stateText='Usage pattern stable';
 if(shortRatio>=.5){state='watch';stateText='High short-trip share'}
 else if(intensityChange!=null&&intensityChange>.25){state='watch';stateText='Usage intensity rising'}
 else if(intensityChange!=null&&intensityChange<-.25){state='positive';stateText='Usage intensity falling'}
 return{vehicle:v,trips,fuel,totalDistance,tripCount,avgTrip,shortTrips,shortRatio,longTrips,activeDays,months,ordered,currentDistance,previousDistance,usageChange,recentAvg,priorAvg,intensityChange,repeatedRoutes,commuteTrips};
}
function render(r){mount();const host=document.getElementById('usageIntelligence');if(!host)return;const trend=r.usageChange==null?'Building usage baseline':`${r.usageChange>0?'+':''}${(r.usageChange*100).toFixed(0)}% vs previous month`;const state=r.shortRatio>=.5?'watch':r.intensityChange!=null&&r.intensityChange>.25?'watch':r.intensityChange!=null&&r.intensityChange<-.25?'positive':'';const label=r.shortRatio>=.5?'High short-trip share':r.intensityChange!=null&&Math.abs(r.intensityChange)>.25?(r.intensityChange>0?'Usage intensity rising':'Usage intensity falling'):trend;const routeText=r.repeatedRoutes.length?`${r.repeatedRoutes[0][1]} repeated trips on your most common GPS route.`:'No repeated GPS route established yet.';host.innerHTML=`<div class="intel-usage-head"><div><span class="eyebrow">USAGE INTELLIGENCE</span><h3 id="usage-intelligence-title">How you are using the car</h3></div><span class="intel-usage-state ${state}">${label}</span></div><div class="intel-usage-grid"><div><span>This month</span><strong>${r.currentDistance?r.currentDistance.toFixed(0)+' km':'—'}</strong></div><div><span>Avg trip</span><strong>${r.avgTrip?r.avgTrip.toFixed(1)+' km':'—'}</strong></div><div><span>Short trips</span><strong>${r.tripCount?pct(r.shortRatio):'—'}</strong></div><div><span>Driving days</span><strong>${r.activeDays||'—'}</strong></div></div><div class="intel-usage-detail"><div><strong>${r.longTrips||0} long trips</strong><span>Trips of 50 km or more recorded.</span></div><div><strong>${r.repeatedRoutes.length?`${r.repeatedRoutes.length} repeated route${r.repeatedRoutes.length===1?'':'s'}`:'Route baseline building'}</strong><span>${routeText}</span></div></div><p class="intel-usage-note">${r.shortRatio>=.5?'A large share of recorded trips are under 5 km. This can be a useful fuel and maintenance-use signal, but it is not a mechanical diagnosis.':r.usageChange!=null?`Monthly distance is ${trend.toLowerCase()}. DRIVE will strengthen this baseline as more trips are recorded.`:'Keep recording drives to build a reliable personal usage baseline.'}</p>`}
async function refresh(){try{const r=await analyse();window.DRIVE_USAGE_LAST=r;render(r);return r}catch(e){console.error('DRIVE usage intelligence failed',e)}}
window.DRIVE_USAGE={analyse,refresh};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
window.addEventListener('drive:datachanged',refresh);
})();
