/* DRIVE v0.44 — Vehicle Memory 2.0 */
(()=>{
"use strict";
const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const fmtKm=v=>Number(v||0).toLocaleString()+" km";
const dateOf=r=>new Date(r?.date||r?.startTime||r?.createdAt||0);
const sortNewest=(a,b)=>dateOf(b)-dateOf(a);
const vehicleOnly=(rows,id)=>rows.filter(r=>!id||r.vehicleId==null||r.vehicleId===id);
function card(label,value,detail=""){return `<div class="memory-v044-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong>${detail?`<small>${esc(detail)}</small>`:""}</div>`}
function empty(label,copy){return `<div class="memory-v044-empty"><strong>${esc(label)}</strong><span>${esc(copy)}</span></div>`}
async function collect(){
 const vehicle=typeof getActiveVehicle==="function"?await getActiveVehicle():null;
 if(!vehicle)return null;
 const [fuel,trips,maintenance,expenses,documents]=await Promise.all(["fuel","trips","maintenance","expenses","documents"].map(getAllRecords));
 const id=vehicle.id;
 const f=vehicleOnly(fuel,id),t=vehicleOnly(trips,id),m=vehicleOnly(maintenance,id),e=vehicleOnly(expenses,id),d=vehicleOnly(documents,id);
 return {vehicle,fuel:f,trips:t,maintenance:m,expenses:e,documents:d};
}
function render(data){
 const root=document.getElementById("vehicleMemory");if(!root||!data)return;
 const {vehicle,fuel,trips,maintenance,expenses,documents}=data;
 const latestService=[...maintenance].sort(sortNewest)[0];
 const latestDrive=[...trips].sort(sortNewest)[0];
 const fuelSpend=fuel.reduce((s,r)=>s+Number(r.cost||0),0);
 const maintenanceSpend=maintenance.reduce((s,r)=>s+Number(r.cost||0),0);
 const expenseSpend=expenses.reduce((s,r)=>s+Number(r.amount||r.cost||0),0);
 const totalSpend=fuelSpend+maintenanceSpend+expenseSpend;
 const age=Math.max(0,new Date().getFullYear()-Number(vehicle.year||new Date().getFullYear()));
 const records=[
  ...maintenance.map(r=>({type:"SERVICE",title:r.title||r.name||"Maintenance",meta:r.odometer?fmtKm(r.odometer):"Service record",date:dateOf(r),cost:Number(r.cost||0)})),
  ...fuel.map(r=>({type:"FUEL",title:`${Number(r.litres||0).toFixed(1)} L fuel`,meta:r.odometer?fmtKm(r.odometer):"Fuel entry",date:dateOf(r),cost:Number(r.cost||0)})),
  ...expenses.map(r=>({type:"EXPENSE",title:r.title||r.description||r.category||"Expense",meta:r.odometer?fmtKm(r.odometer):r.category||"Expense",date:dateOf(r),cost:Number(r.amount||r.cost||0)})),
  ...documents.map(r=>({type:"DOCUMENT",title:r.name||r.filename||"Document",meta:"Vehicle document",date:dateOf(r),cost:0}))
 ].sort((a,b)=>b.date-a.date).slice(0,8);
 const issueText=vehicle.knownIssues||vehicle.knownIssue||"No known issues recorded";
 root.innerHTML=`
 <section class="memory-v044-identity">
  <div><span class="eyebrow">VEHICLE MEMORY</span><h2>${esc(vehicle.name||`${vehicle.make||"Vehicle"} ${vehicle.model||""}`)}</h2><p>${esc(vehicle.make||"")} ${esc(vehicle.model||"")} · ${esc(vehicle.year||"—")} · ${esc(vehicle.engine||"Engine not recorded")}</p></div>
  <button type="button" class="memory-v044-edit" id="memoryVehicleEdit">EDIT</button>
 </section>
 <div class="memory-v044-grid">
  ${card("ODOMETER",fmtKm(vehicle.odometer),"Current vehicle reading")}
  ${card("AGE",age+" years",vehicle.year?`Model year ${vehicle.year}`:"Year not recorded")}
  ${card("DRIVES",String(trips.length),"Recorded trips")}
  ${card("SERVICE RECORDS",String(maintenance.length),"Maintenance history")}
 </div>
 <section class="memory-v044-section"><div class="memory-v044-heading"><span>VEHICLE MEMORY</span><small>${fuel.length+maintenance.length+expenses.length+documents.length} records</small></div>
  <div class="memory-v044-summary">
   ${card("FUEL SPEND",`P${fuelSpend.toFixed(2)}`,`${fuel.length} fuel entries`)}
   ${card("SERVICE SPEND",`P${maintenanceSpend.toFixed(2)}`,`${maintenance.length} service records`)}
   ${card("TOTAL RECORDED",`P${totalSpend.toFixed(2)}`,"Fuel + service + expenses")}
  </div>
 </section>
 <section class="memory-v044-section"><div class="memory-v044-heading"><span>KNOWN STATE</span></div>
  <div class="memory-v044-state"><div><span>KNOWN ISSUES</span><strong>${esc(issueText)}</strong></div><div><span>LAST SERVICE</span><strong>${latestService?esc(latestService.title||latestService.name||"Maintenance")+" · "+esc(latestService.odometer?fmtKm(latestService.odometer):dateOf(latestService).toLocaleDateString()):"No service recorded yet"}</strong></div><div><span>LAST DRIVE</span><strong>${latestDrive?esc((Number(latestDrive.distance||0)).toFixed(1)+" km")+" · "+dateOf(latestDrive).toLocaleDateString():"No drive recorded yet"}</strong></div></div>
 </section>
 <section class="memory-v044-section"><div class="memory-v044-heading"><span>MEMORY TIMELINE</span><small>Latest records</small></div>
  <div class="memory-v044-timeline">${records.length?records.map(r=>`<article><span class="memory-v044-dot ${r.type.toLowerCase()}"></span><div><strong>${esc(r.title)}</strong><small>${esc(r.type)} · ${esc(r.meta)} · ${r.date.toLocaleDateString()}</small></div>${r.cost?`<b>P${r.cost.toFixed(2)}</b>`:""}</article>`).join(""):empty("Nothing recorded yet","Your fuel, service, expense and document history will build this memory automatically.")}</div>
 </section>`;
 document.getElementById("memoryVehicleEdit")?.addEventListener("click",()=>window.DRIVE_VEHICLE_SETTINGS?.open?.());
}
async function refresh(){try{const data=await collect();if(data)render(data)}catch(error){console.error("Vehicle Memory failed",error)}}
async function open(){if(typeof window.DRIVE_APP?.showPage==="function")window.DRIVE_APP.showPage("carPage");await refresh()}
window.DRIVE_MEMORY={refresh,open};
function boot(){refresh()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
