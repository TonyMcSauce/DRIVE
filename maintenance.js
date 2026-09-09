/* DRIVE v0.31 — Maintenance + Service Intelligence */
(() => {
    "use strict";
    const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const money = value => `P${Number(value || 0).toFixed(2)}`;
    const today = () => new Date().toISOString().slice(0,10);
    const dateLabel = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}); };
    const vehicleMatch = (r,v) => !v?.id || r.vehicleId == null || r.vehicleId === v.id;

    async function intelligence() {
        const vehicle = await getActiveVehicle();
        const records = (await getAllRecords("maintenance")).filter(r=>vehicleMatch(r,vehicle)).sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));
        const latest = records[0] || null;
        const scheduled = records.find(r=>Number(r.nextServiceOdometer)>0 || r.nextServiceDate) || null;
        if(!scheduled) return {vehicle,records,latest,scheduled:null,status:"unknown",kmRemaining:null,daysRemaining:null};
        const odo = Number(vehicle?.odometer||0), nextOdo=Number(scheduled.nextServiceOdometer||0);
        const nextDate = scheduled.nextServiceDate ? new Date(`${scheduled.nextServiceDate}T00:00:00`) : null;
        const kmRemaining = nextOdo>0 ? nextOdo-odo : null;
        const daysRemaining = nextDate && !Number.isNaN(nextDate.getTime()) ? Math.ceil((nextDate-Date.now())/86400000) : null;
        const overdue = (kmRemaining!=null && kmRemaining<=0) || (daysRemaining!=null && daysRemaining<=0);
        const dueSoon = !overdue && ((kmRemaining!=null && kmRemaining<=1000) || (daysRemaining!=null && daysRemaining<=30));
        return {vehicle,records,latest,scheduled,status:overdue?"overdue":dueSoon?"due-soon":"ok",kmRemaining,daysRemaining};
    }

    function ensureModal() {
        let modal=document.getElementById("maintenanceModal");
        if(modal) return modal;
        modal=document.createElement("div");
        modal.id="maintenanceModal"; modal.className="modal hidden"; modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true"); modal.setAttribute("aria-labelledby","maintenance-modal-title");
        modal.innerHTML=`<div class="modal-sheet"><div class="modal-handle" aria-hidden="true"></div><div class="modal-header"><div><span class="eyebrow">SERVICE RECORD</span><h2 id="maintenance-modal-title">Maintenance</h2></div><button type="button" class="modal-close" data-close-maintenance aria-label="Close maintenance">×</button></div><form id="maintenanceForm"><label for="maintenanceTitle">Service / repair<input id="maintenanceTitle" required maxlength="100" placeholder="Oil service, brakes, battery…"></label><label for="maintenanceDescription">Notes<textarea id="maintenanceDescription" rows="3" maxlength="500" placeholder="What was done?"></textarea></label><label for="maintenanceOdometer">Odometer<div class="input-unit"><input id="maintenanceOdometer" type="number" min="0" step="1" inputmode="numeric" required><span aria-hidden="true">KM</span></div></label><label for="maintenanceCost">Cost<div class="input-unit"><span aria-hidden="true">P</span><input id="maintenanceCost" type="number" min="0" step="0.01" inputmode="decimal" value="0"></div></label><label for="maintenanceDate">Date<input id="maintenanceDate" type="date" required></label><div class="form-grid"><div><label for="maintenanceIntervalKm">Next service interval (km)</label><input id="maintenanceIntervalKm" type="number" min="0" step="1" inputmode="numeric"><small>Optional</small></div><div><label for="maintenanceIntervalMonths">Next service interval (months)</label><input id="maintenanceIntervalMonths" type="number" min="0" step="1" inputmode="numeric"><small>Optional</small></div></div><button class="submit-button" type="submit">SAVE SERVICE</button></form><div id="maintenanceHistory" class="tool-history"></div></div>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-close-maintenance]").addEventListener("click",()=>modal.classList.add("hidden"));
        modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.add("hidden")});
        return modal;
    }

    async function renderHistory(modal) {
        const list=modal?.querySelector("#maintenanceHistory"); if(!list)return;
        const rows=(await getAllRecords("maintenance")).filter(async r=>r).filter(r=>true);
        const vehicle=await getActiveVehicle();
        const own=rows.filter(r=>vehicleMatch(r,vehicle)).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
        list.innerHTML=`<div class="tool-history-title">SERVICE HISTORY</div>`+(own.length?own.slice(0,12).map(r=>`<div class="tool-history-row maintenance-history-row"><span><strong>${esc(r.title||"Maintenance")}</strong><small>${esc(dateLabel(r.date))} · ${Number(r.odometer||0).toLocaleString()} km${r.nextServiceOdometer?` · next ${Number(r.nextServiceOdometer).toLocaleString()} km`:r.nextServiceDate?` · next ${esc(dateLabel(r.nextServiceDate))}`:""}</small></span><span class="history-row-end"><b>${money(r.cost)}</b><button type="button" class="history-delete" data-maintenance-delete="${esc(r.id)}" aria-label="Delete ${esc(r.title||"service record")}">×</button></span></div>`).join(""):"<p class=\"tool-empty\">No service records yet. Your first record will appear here.</p>");
        list.querySelectorAll("[data-maintenance-delete]").forEach(button=>button.addEventListener("click",async()=>{if(!confirm("Delete this service record? This cannot be undone."))return;await deleteRecord("maintenance",button.dataset.maintenanceDelete);window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"maintenance"}}));await renderHistory(modal);await refresh()}));
    }

    async function saveMaintenance(event) {
        event.preventDefault();
        const form=event.currentTarget, vehicle=await getActiveVehicle();
        const odometer=Number(document.getElementById("maintenanceOdometer")?.value||0), cost=Number(document.getElementById("maintenanceCost")?.value||0), date=document.getElementById("maintenanceDate")?.value||today(), intervalKm=Number(document.getElementById("maintenanceIntervalKm")?.value||0), intervalMonths=Number(document.getElementById("maintenanceIntervalMonths")?.value||0);
        const title=document.getElementById("maintenanceTitle")?.value.trim();
        if(!title || !Number.isFinite(odometer) || odometer<0 || !Number.isFinite(cost) || cost<0){announce?.("Check the service details and try again.");return}
        let nextServiceDate=null;
        if(intervalMonths>0){const d=new Date(`${date}T00:00:00`);d.setMonth(d.getMonth()+intervalMonths);nextServiceDate=d.toISOString().slice(0,10)}
        await addRecord("maintenance",{vehicleId:vehicle?.id,title,description:document.getElementById("maintenanceDescription")?.value.trim()||"",odometer,cost,date,intervalKm:intervalKm||null,intervalMonths:intervalMonths||null,nextServiceOdometer:intervalKm>0?odometer+intervalKm:null,nextServiceDate,createdAt:new Date().toISOString(),synced:false});
        const modal=document.getElementById("maintenanceModal"); modal?.classList.add("hidden"); form.reset(); document.getElementById("maintenanceDate").value=today();
        announce?.("Service record saved."); window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"maintenance"}}));
    }

    function mountForm() {
        const modal=ensureModal(), form=modal.querySelector("#maintenanceForm");
        if(!form.dataset.driveBound){form.dataset.driveBound="1";form.addEventListener("submit",saveMaintenance)}
        const vehiclePromise=typeof getActiveVehicle==="function"?getActiveVehicle():Promise.resolve(null);
        Promise.resolve(vehiclePromise).then(vehicle=>{const odo=modal.querySelector("#maintenanceOdometer");if(odo&&!odo.value)odo.value=vehicle?.odometer||"";const date=modal.querySelector("#maintenanceDate");if(date&&!date.value)date.value=today()});
        return modal;
    }

    function openMaintenance(){const modal=mountForm();modal.classList.remove("hidden");modal.querySelector("#maintenanceTitle")?.focus();renderHistory(modal).catch(console.error)}

    async function refresh(){
        const d=await intelligence();
        const existing=document.getElementById("serviceIntel"); if(existing)existing.remove();
        const dashboard=document.getElementById("dashboardPage"), anchor=dashboard?.querySelector(".metric-grid"); if(!anchor)return;
        const section=document.createElement("section"); section.id="serviceIntel"; section.className="service-intel";
        const status=d.status==="overdue"?"OVERDUE":d.status==="due-soon"?"DUE SOON":d.status==="ok"?"ON TRACK":"BUILDING";
        const statusClass=d.status==="overdue"?"attention":d.status==="due-soon"?"watch":d.status==="ok"?"ok":"neutral";
        const nextParts=[]; if(d.kmRemaining!=null)nextParts.push(`${Math.max(0,d.kmRemaining).toLocaleString()} km`); if(d.daysRemaining!=null)nextParts.push(`${Math.max(0,d.daysRemaining)} days`);
        section.innerHTML=`<div class="section-title">SERVICE INTELLIGENCE</div><article class="service-intel-card"><div class="service-intel-head"><div><span class="service-kicker">SERVICE STATUS</span><strong>${d.latest?esc(d.latest.title||"Service recorded"):"No service records"}</strong></div><span class="service-status ${statusClass}">${status}</span></div><div class="service-intel-grid"><div><span>LAST SERVICE</span><strong>${d.latest?dateLabel(d.latest.date):"—"}</strong><small>${d.latest?`${Number(d.latest.odometer||0).toLocaleString()} km · ${money(d.latest.cost)}`:"Record your first service"}</small></div><div><span>NEXT SERVICE</span><strong>${d.scheduled?(nextParts.length?nextParts.join(" · "):"Interval set"):"No interval set"}</strong><small>${d.scheduled?(d.scheduled.nextServiceDate?`Target ${dateLabel(d.scheduled.nextServiceDate)}`:`Target ${Number(d.scheduled.nextServiceOdometer||0).toLocaleString()} km`):"Add an interval when you record service"}</small></div></div><div class="service-intel-foot"><span>${d.records.length} service record${d.records.length===1?"":"s"} stored</span><button type="button" class="service-record-button" data-action="service">${d.records.length?"RECORD SERVICE":"ADD SERVICE"}</button></div></article>`;
        anchor.parentNode.insertBefore(section,anchor.nextSibling);
        section.querySelector("[data-action=service]")?.addEventListener("click",openMaintenance);
    }

    window.DRIVE_MAINTENANCE={refresh,intelligence,openMaintenance,mountForm,renderHistory};
    document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>refresh().catch(console.error),250));
})();
