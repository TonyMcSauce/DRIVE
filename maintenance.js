/* DRIVE v0.9 — Maintenance + Service Intelligence */
(() => {
    "use strict";
    const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const money = value => `P${Number(value || 0).toFixed(2)}`;
    const dateLabel = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}); };
    const vehicleMatch = (r,v) => !v?.id || r.vehicleId == null || r.vehicleId === v.id;

    async function intelligence() {
        const vehicle = await getActiveVehicle();
        const records = (await getAllRecords("maintenance")).filter(r=>vehicleMatch(r,vehicle)).sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));
        const latest = records[0] || null;
        let scheduled = records.find(r=>Number(r.nextServiceOdometer)>0 || r.nextServiceDate) || null;
        if(!scheduled) return {vehicle,records,latest,scheduled:null,status:"unknown",kmRemaining:null,daysRemaining:null};
        const odo = Number(vehicle?.odometer||0), nextOdo=Number(scheduled.nextServiceOdometer||0);
        const nextDate = scheduled.nextServiceDate ? new Date(scheduled.nextServiceDate) : null;
        const kmRemaining = nextOdo>0 ? nextOdo-odo : null;
        const daysRemaining = nextDate && !Number.isNaN(nextDate.getTime()) ? Math.ceil((nextDate-Date.now())/86400000) : null;
        const overdue = (kmRemaining!=null && kmRemaining<=0) || (daysRemaining!=null && daysRemaining<=0);
        const dueSoon = !overdue && ((kmRemaining!=null && kmRemaining<=1000) || (daysRemaining!=null && daysRemaining<=30));
        return {vehicle,records,latest,scheduled,status:overdue?"overdue":dueSoon?"due-soon":"ok",kmRemaining,daysRemaining};
    }

    function openMaintenance(){ const modal=document.getElementById("maintenanceModal"); if(modal){modal.classList.remove("hidden");document.getElementById("maintenanceTitle")?.focus();} }
    function mountForm(){
        const form=document.getElementById("maintenanceForm"); if(!form||form.dataset.driveBound)return; form.dataset.driveBound="1";
        const wrap=form.querySelector("fieldset") || form;
        if(!document.getElementById("maintenanceIntervalKm")) wrap.insertAdjacentHTML("beforeend",`<div class="form-grid"><div><label for="maintenanceIntervalKm">Next service interval (km)</label><input id="maintenanceIntervalKm" type="number" min="0" step="1" inputmode="numeric"><small>Optional</small></div><div><label for="maintenanceIntervalMonths">Next service interval (months)</label><input id="maintenanceIntervalMonths" type="number" min="0" step="1" inputmode="numeric"><small>Optional</small></div></div>`);
        form.addEventListener("submit",async e=>{e.preventDefault();const vehicle=await getActiveVehicle();const odometer=Number(document.getElementById("maintenanceOdometer")?.value||vehicle?.odometer||0),cost=Number(document.getElementById("maintenanceCost")?.value||0),date=document.getElementById("maintenanceDate")?.value||new Date().toISOString().slice(0,10),intervalKm=Number(document.getElementById("maintenanceIntervalKm")?.value||0),intervalMonths=Number(document.getElementById("maintenanceIntervalMonths")?.value||0);const nextServiceOdometer=intervalKm>0?odometer+intervalKm:null;let nextServiceDate=null;if(intervalMonths>0){const d=new Date(`${date}T00:00:00`);d.setMonth(d.getMonth()+intervalMonths);nextServiceDate=d.toISOString().slice(0,10);}await addRecord("maintenance",{vehicleId:vehicle?.id,title:document.getElementById("maintenanceTitle")?.value.trim()||"Maintenance",description:document.getElementById("maintenanceDescription")?.value.trim()||"",odometer,cost,date,intervalKm:intervalKm||null,intervalMonths:intervalMonths||null,nextServiceOdometer,nextServiceDate,createdAt:new Date().toISOString(),synced:false});document.getElementById("maintenanceModal")?.classList.add("hidden");form.reset();window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"maintenance"}}));});
    }
    async function refresh(){mountForm();const d=await intelligence();const existing=document.getElementById("serviceIntel");if(existing)existing.remove();const dashboard=document.getElementById("dashboardPage"),anchor=dashboard?.querySelector(".metric-grid");if(!anchor)return;const section=document.createElement("section");section.id="serviceIntel";section.className="fuel-intel";section.innerHTML=`<div class="section-title">SERVICE INTELLIGENCE</div><article class="fuel-intel-card"><span>STATUS</span><strong>${d.status==="overdue"?"OVERDUE":d.status==="due-soon"?"DUE SOON":d.status==="ok"?"ON TRACK":"NO INTERVAL"}</strong><small>${d.scheduled?`${esc(d.scheduled.title||"Service")} · next ${d.kmRemaining!=null?`${Math.max(0,d.kmRemaining).toLocaleString()} km`:"—"}${d.daysRemaining!=null?` · ${Math.max(0,d.daysRemaining)} days`:""}`:"Record a service interval to activate reminders."}</small></article>`;anchor.parentNode.insertBefore(section,anchor.nextSibling);}
    window.DRIVE_MAINTENANCE={refresh,intelligence,openMaintenance};
    document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>refresh().catch(console.error),250));
    (function(){["maintenance-intelligence.js","fuel-intelligence.js","trip-intelligence.js","anomaly-engine.js"].forEach(src=>{const s=document.createElement("script");s.src=`./${src}?v=0.9`;document.head.appendChild(s)})})();
})();
