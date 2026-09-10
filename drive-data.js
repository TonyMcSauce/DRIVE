/* DRIVE v0.50 — unified vehicle data layer */
(() => {
  "use strict";
  const cache=new Map(),TTL=1500;
  const stores=["fuel","trips","maintenance","expenses","documents","components"];
  const sameVehicle=(r,v)=>!v?.id||r?.vehicleId==null||r.vehicleId===v.id;
  const dateOf=r=>new Date(r?.date||r?.startTime||r?.createdAt||r?.updatedAt||0);
  const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  const number=v=>Number.isFinite(Number(v))?Number(v):0;
  async function records(store){const hit=cache.get(store);if(hit&&Date.now()-hit.time<TTL)return hit.data;const data=await getAllRecords(store);cache.set(store,{time:Date.now(),data});return data}
  function invalidate(store){if(store)cache.delete(store);else cache.clear()}
  async function vehicleRecords(store,vehicle){return(await records(store)).filter(r=>sameVehicle(r,vehicle))}
  async function snapshot(){const vehicle=await getActiveVehicle(),data={vehicle};await Promise.all(stores.map(async store=>{data[store]=await vehicleRecords(store,vehicle)}));return data}
  function emit(store){invalidate(store);window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store}}))}
  function currentMonth(date=new Date()){return{key:monthKey(date),fuel:[],trips:[],maintenance:[],expenses:[],documents:[],components:[]}}
  function sortNewest(list){return[...list].sort((a,b)=>dateOf(b)-dateOf(a))}
  function derive(data){const month=currentMonth();for(const store of stores)month[store]=data[store].filter(r=>monthKey(dateOf(r))===month.key);const fuelSpend=data.fuel.reduce((s,r)=>s+number(r.cost),0),expenseSpend=data.expenses.reduce((s,r)=>s+number(r.amount),0),maintenanceSpend=data.maintenance.reduce((s,r)=>s+number(r.cost),0),distance=data.trips.reduce((s,r)=>s+number(r.distance),0),litres=data.fuel.reduce((s,r)=>s+number(r.litres),0),fuelDistance=data.fuel.reduce((s,r)=>s+number(r.distance),0),totalSpend=fuelSpend+expenseSpend+maintenanceSpend;return{month,latest:{fuel:sortNewest(data.fuel)[0]||null,trip:sortNewest(data.trips)[0]||null,maintenance:sortNewest(data.maintenance)[0]||null,expense:sortNewest(data.expenses)[0]||null},metrics:{fuelSpend,expenseSpend,maintenanceSpend,totalSpend,distance,litres,economy:fuelDistance>0?litres/fuelDistance*100:null,costPerKm:distance>0?totalSpend/distance:null,fuelCostPerKm:fuelDistance>0?fuelSpend/fuelDistance:null,fuelPrice:litres>0?fuelSpend/litres:null}}}
  async function intelligence(){const data=await snapshot();return{...data,...derive(data)}}
  async function getVehicleState(){const data=await intelligence();return{vehicle:data.vehicle,odometer:number(data.vehicle?.odometer),counts:Object.fromEntries(stores.map(s=>[s,data[s].length])),metrics:data.metrics,latest:data.latest}}
  window.DRIVE_DATA={records,vehicleRecords,invalidate,snapshot,intelligence,getVehicleState,derive,emit,dateOf,monthKey,sortNewest,stores};
  window.addEventListener("drive:datachanged",event=>invalidate(event.detail?.store));
})();
