/* DRIVE v0.32 — Maintenance + Service Intelligence */
(()=>{
"use strict";
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>`P${Number(v||0).toFixed(2)}`;
const today=()=>new Date().toISOString().slice(0,10);
const vehicleMatch=(r,v)=>!v?.id||r.vehicleId==null||String(r.vehicleId)===String(v.id);
const notify=msg=>typeof announce==='function'?announce(msg):console.info(msg);

async function intelligence(){
 const vehicle=await getActiveVehicle();
 const records=(await getAllRecords('maintenance')).filter(r=>vehicleMatch(r,vehicle)).sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));
 const latest=records[0]||null;
 const scheduled=records.find(r=>Number(r.nextServiceOdometer)>0||r.nextServiceDate)||null;
 if(!scheduled)return{vehicle,records,latest,scheduled:null,status:'unknown',kmRemaining:null,daysRemaining:null};
 const odo=Number(vehicle?.odometer||0),nextOdo=Number(scheduled.nextServiceOdometer||0);
 const nextDate=scheduled.nextServiceDate?new Date(`${scheduled.nextServiceDate}T00:00:00`):null;
 const kmRemaining=nextOdo>0?nextOdo-odo:null;
 const daysRemaining=nextDate&&!Number.isNaN(nextDate.getTime())?Math.ceil((nextDate-Date.now())/86400000):null;
 const overdue=(kmRemaining!=null&&kmRemaining<=0)||(daysRemaining!=null&&daysRemaining<=0);
 const dueSoon=!overdue&&((kmRemaining!=null&&kmRemaining<=1000)||(daysRemaining!=null&&daysRemaining<=30));
 return{vehicle,records,latest,scheduled,status:overdue?'overdue':dueSoon?'due-soon':'ok',kmRemaining,daysRemaining};
}
function ensureModal(){
 let m=document.getElementById('maintenanceModal');
 if(!m){
  m=document.createElement('div');m.id='maintenanceModal';m.className='modal hidden';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','maintenance-modal-title');
  m.innerHTML=`<div class="modal-sheet"><div class="modal-handle" aria-hidden="true"></div><div class="modal-header"><div><span class="eyebrow">SERVICE RECORD</span><h2 id="maintenance-modal-title">Maintenance</h2></div><button type="button" class="modal-close" data-close-maintenance aria-label="Close maintenance">×</button></div><form id="maintenanceForm"><label for="maintenanceTitle">Service / repair<input id="maintenanceTitle" required maxlength="100" placeholder="Oil service, brakes, battery…"></label><label for="maintenanceDescription">Notes<textarea id="maintenanceDescription" rows="3" maxlength="500" placeholder="What was done?"></textarea></label><label for="maintenanceOdometer">Odometer<div class="input-unit"><input id="maintenanceOdometer" type="number" min="0" step="1" inputmode="numeric" required><span aria-hidden="true">KM</span></div></label><label for="maintenanceCost">Cost<div class="input-unit"><span aria-hidden="true">P</span><input id="maintenanceCost" type="number" min="0" step="0.01" inputmode="decimal" value="0"></div></label><label for="maintenanceDate">Date<input id="maintenanceDate" type="date" required></label><div class="form-grid"><div><label for="maintenanceIntervalKm">Next service interval (km)</label><input id="maintenanceIntervalKm" type="number" min="0" step="1" inputmode="numeric"><small>Optional</small></div><div><label for="maintenanceIntervalMonths">Next service interval (months)</label><input id="maintenanceIntervalMonths" type="number" min="0" step="1" inputmode="numeric"><small>Optional</small></div></div><button class="submit-button" type="submit">SAVE SERVICE</button></form><div id="maintenanceHistory" class="tool-history"></div></div>`;
  document.body.appendChild(m);
 } else {
  const sheet=m.querySelector('.modal-sheet');
  if(sheet&&!sheet.querySelector('#maintenanceHistory')){const history=document.createElement('div');history.id='maintenanceHistory';history.className='tool-history';sheet.appendChild(history);}
 }
 const close=m.querySelector('[data-close-maintenance]');
 if(close&&!close.dataset.bound){close.dataset.bound='1';close.onclick=()=>m.classList.add('hidden')}
 if(!m.dataset.overlayBound){m.dataset.overlayBound='1';m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hidden')})}
 return m;
}
async function renderHistory(m){
 const list=m?.querySelector('#maintenanceHistory');if(!list)return;const v=await getActiveVehicle();
 const rows=(await getAllRecords('maintenance')).filter(r=>vehicleMatch(r,v)).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
 list.innerHTML=`<div class="tool-history-title">SERVICE HISTORY</div>`+(rows.length?rows.slice(0,20).map(r=>`<div class="tool-history-row maintenance-history-row"><span><strong>${esc(r.title||'Maintenance')}</strong><small>${esc(r.date||'')} · ${Number(r.odometer||0).toLocaleString()} km${r.nextServiceOdometer?` · next ${Number(r.nextServiceOdometer).toLocaleString()} km`:r.nextServiceDate?` · next ${esc(r.nextServiceDate)}`:''}</small></span><span class="history-row-end"><b>${money(r.cost)}</b><button type="button" class="history-delete" data-maintenance-delete="${r.id}" aria-label="Delete service record">×</button></span></div>`).join(''):'<p class="tool-empty">No service records yet. Your first record will appear here.</p>');
 list.querySelectorAll('[data-maintenance-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this service record? This cannot be undone.'))return;await deleteRecord('maintenance',b.dataset.maintenanceDelete);await renderHistory(m);await refresh();window.dispatchEvent(new CustomEvent('drive:datachanged',{detail:{store:'maintenance'}}))});
}
async function saveMaintenance(e){
 e.preventDefault();const form=e.currentTarget,vehicle=await getActiveVehicle();
 const title=document.getElementById('maintenanceTitle')?.value.trim(),description=document.getElementById('maintenanceDescription')?.value.trim()||'',odometer=Number(document.getElementById('maintenanceOdometer')?.value),cost=Number(document.getElementById('maintenanceCost')?.value||0),date=document.getElementById('maintenanceDate')?.value||today(),intervalKm=Number(document.getElementById('maintenanceIntervalKm')?.value||0),intervalMonths=Number(document.getElementById('maintenanceIntervalMonths')?.value||0);
 if(!vehicle){notify('No active vehicle found. Open Vehicle Settings first.');return}
 if(!title||!Number.isFinite(odometer)||odometer<0||!Number.isFinite(cost)||cost<0||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)){notify('Check the service details and try again.');return}
 let nextServiceDate=null;if(intervalMonths>0){const d=new Date(`${date}T00:00:00`);d.setMonth(d.getMonth()+intervalMonths);nextServiceDate=d.toISOString().slice(0,10)}
 const record={vehicleId:vehicle.id,title,description,odometer,cost,date,intervalKm:intervalKm||null,intervalMonths:intervalMonths||null,nextServiceOdometer:intervalKm>0?odometer+intervalKm:null,nextServiceDate,createdAt:new Date().toISOString(),synced:false};
 try{
   const id=await addRecord('maintenance',record);record.id=id;
   if(odometer>Number(vehicle.odometer||0)){vehicle.odometer=odometer;await putRecord('vehicles',vehicle)}
   const modal=ensureModal();await renderHistory(modal);modal?.classList.add('hidden');form.reset();const d=document.getElementById('maintenanceDate');if(d)d.value=today();
   notify(`Service saved: ${title}.`);window.dispatchEvent(new CustomEvent('drive:datachanged',{detail:{store:'maintenance',id}}));
 }catch(error){console.error('DRIVE maintenance save failed',error);notify('Service could not be saved. Check local storage and try again.')}
}
function mountForm(){const m=ensureModal(),form=m.querySelector('#maintenanceForm');if(!form){notify('Maintenance form is unavailable. Reload DRIVE and try again.');return m}if(!form.dataset.driveBound){form.dataset.driveBound='1';form.addEventListener('submit',saveMaintenance)}Promise.resolve(getActiveVehicle()).then(v=>{const o=m.querySelector('#maintenanceOdometer');if(o&&!o.value)o.value=v?.odometer||'';const d=m.querySelector('#maintenanceDate');if(d&&!d.value)d.value=today()});return m}
async function openMaintenance(){const m=mountForm();await renderHistory(m);m.classList.remove('hidden');m.querySelector('#maintenanceTitle')?.focus()}
async function refresh(){
 const d=await intelligence();document.getElementById('serviceIntel')?.remove();const dashboard=document.getElementById('dashboardPage'),anchor=dashboard?.querySelector('.metric-grid');if(!anchor)return;
 const section=document.createElement('section');section.id='serviceIntel';section.className='service-intel';const status=d.status==='overdue'?'OVERDUE':d.status==='due-soon'?'DUE SOON':d.status==='ok'?'ON TRACK':'BUILDING',statusClass=d.status==='overdue'?'attention':d.status==='due-soon'?'watch':d.status==='ok'?'ok':'neutral';
 const parts=[];if(d.kmRemaining!=null)parts.push(`${Math.max(0,d.kmRemaining).toLocaleString()} km`);if(d.daysRemaining!=null)parts.push(`${Math.max(0,d.daysRemaining)} days`);
 section.innerHTML=`<div class="section-title">SERVICE INTELLIGENCE</div><article class="service-intel-card"><div class="service-intel-head"><div><span class="service-kicker">SERVICE STATUS</span><strong>${d.latest?esc(d.latest.title||'Service recorded'):'No service records'}</strong></div><span class="service-status ${statusClass}">${status}</span></div><div class="service-intel-grid"><div><span>LAST SERVICE</span><strong>${d.latest?esc(d.latest.date):'—'}</strong><small>${d.latest?`${Number(d.latest.odometer||0).toLocaleString()} km · ${money(d.latest.cost)}`:'Record your first service'}</small></div><div><span>NEXT SERVICE</span><strong>${d.scheduled?(parts.length?parts.join(' · '):'Interval set'):'No interval set'}</strong><small>${d.scheduled?(d.scheduled.nextServiceDate?`Target ${esc(d.scheduled.nextServiceDate)}`:`Target ${Number(d.scheduled.nextServiceOdometer||0).toLocaleString()} km`):'Add an interval when you record service'}</small></div></div><div class="service-intel-foot"><span>${d.records.length} service record${d.records.length===1?'':'s'} stored</span><button type="button" class="service-record-button">${d.records.length?'RECORD SERVICE':'ADD SERVICE'}</button></div></article>`;
 anchor.parentNode.insertBefore(section,anchor.nextSibling);section.querySelector('.service-record-button')?.addEventListener('click',openMaintenance);
}
window.DRIVE_MAINTENANCE={refresh,intelligence,openMaintenance,mountForm,renderHistory};
function boot(){refresh().catch(console.error)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();