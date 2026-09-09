/* DRIVE v0.9 — Maintenance Intelligence */
(() => {
    "use strict";
    const dateOf = r => new Date(r?.date || r?.createdAt || 0);
    const vehicleMatch = (r,v) => !v?.id || r.vehicleId == null || r.vehicleId === v.id;
    const DAY = 86400000;

    async function analyse(){
        const vehicle=await getActiveVehicle();
        const records=(await getAllRecords("maintenance")).filter(r=>vehicleMatch(r,vehicle)).sort((a,b)=>dateOf(b)-dateOf(a));
        const odo=Number(vehicle?.odometer||0);
        const services=records.map(r=>{
            const intervalKm=Number(r.intervalKm||0),intervalMonths=Number(r.intervalMonths||0);
            const nextOdometer=Number(r.nextServiceOdometer||0) || (intervalKm>0&&Number(r.odometer)>0?Number(r.odometer)+intervalKm:0);
            let nextDate=r.nextServiceDate||"";
            if(!nextDate&&intervalMonths>0&&r.date){const d=new Date(`${r.date}T00:00:00`);d.setMonth(d.getMonth()+intervalMonths);nextDate=d.toISOString().slice(0,10);}
            return {...r,intervalKm,intervalMonths,nextOdometer,nextDate};
        });
        const scheduled=services.filter(r=>r.nextOdometer||r.nextDate);
        const due=scheduled.filter(r=>(r.nextOdometer&&odo>=r.nextOdometer)||(r.nextDate&&new Date(r.nextDate)<=new Date()));
        const soon=scheduled.filter(r=>!due.includes(r)&&((r.nextOdometer&&r.nextOdometer-odo<=1000)||(r.nextDate&&(new Date(r.nextDate)-Date.now())<=30*DAY)));
        const last=records[0]||null;
        return {vehicle,records,services,last,due,soon,status:due.length?"OVERDUE":soon.length?"DUE SOON":scheduled.length?"ON TRACK":"NO INTERVAL"};
    }
    function inject(){
        if(document.getElementById("maintenanceIntel"))return;
        const dashboard=document.getElementById("dashboardPage"),anchor=dashboard?.querySelector(".metric-grid");
        if(!anchor)return;
        const s=document.createElement("section");s.id="maintenanceIntel";s.className="maintenance-intel";s.setAttribute("aria-labelledby","maintenance-intel-title");
        s.innerHTML=`<div class="section-title" id="maintenance-intel-title">SERVICE INTELLIGENCE</div><div id="maintenanceIntelBody"></div>`;anchor.insertAdjacentElement("afterend",s);
        const css=document.createElement("style");css.id="maintenanceIntelStyles";css.textContent=`.maintenance-intel{margin:18px 0}.mi-card{padding:15px;background:var(--surface);border:1px solid var(--line);border-radius:15px;display:flex;justify-content:space-between;gap:14px;align-items:center}.mi-card strong{display:block;font-size:18px;letter-spacing:-.03em}.mi-card span,.mi-meta{display:block;color:var(--muted);font-size:9px;line-height:1.5}.mi-status{font-size:9px;font-weight:900;letter-spacing:.1em;color:var(--accent);white-space:nowrap}.mi-overdue{color:var(--danger)}.mi-soon{color:var(--warning)}`;document.head.appendChild(css);
    }
    async function refresh(){inject();const body=document.getElementById("maintenanceIntelBody");if(!body)return;const d=await analyse();if(!d.last){body.innerHTML=`<div class="mi-card"><div><strong>Maintenance baseline needed</strong><span>Record your first service to start tracking vehicle care.</span></div><b class="mi-status">NO DATA</b></div>`;return;}const r=d.last;let detail="Last recorded service";if(d.due.length)detail=`${d.due.length} service item${d.due.length===1?"":"s"} overdue`;else if(d.soon.length)detail=`${d.soon.length} service item${d.soon.length===1?"":"s"} due soon`;else if(d.status==="NO INTERVAL")detail="Set an interval on a service record to enable countdowns";else detail="Scheduled service is on track";const cls=d.status==="OVERDUE"?"mi-overdue":d.status==="DUE SOON"?"mi-soon":"mi-status";body.innerHTML=`<div class="mi-card"><div><strong>${String(r.title||"Service").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}</strong><span>${detail}</span></div><b class="${cls}">${d.status}</b></div>`;}
    window.DRIVE_MAINTENANCE_INTEL={analyse,refresh};
})();
