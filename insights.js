/* DRIVE v0.6 — intelligence, analytics & vehicle controls */
(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const money = n => `P${Number(n || 0).toFixed(2)}`;
    const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };

    function styles() {
        if ($("driveIntelligenceStyles")) return;
        const s = document.createElement("style"); s.id = "driveIntelligenceStyles";
        s.textContent = `
        .drive-insights{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0 26px}.drive-insight{padding:16px;background:var(--surface);border:1px solid var(--line);border-radius:16px}.drive-insight span{display:block;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.1em}.drive-insight strong{display:block;margin-top:8px;font-size:22px;letter-spacing:-.04em}.drive-insight small{display:block;margin-top:4px;color:var(--muted);font-size:9px}.drive-reminder{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 16px;margin:0 0 26px;border:1px solid rgba(244,201,93,.2);background:rgba(244,201,93,.05);border-radius:16px}.drive-reminder strong{font-size:12px}.drive-reminder span{display:block;color:var(--muted);font-size:10px;margin-top:4px}.drive-reminder button{border:0;background:var(--warning);color:#111;padding:10px 13px;border-radius:10px;font-size:9px;font-weight:900;white-space:nowrap}.drive-modal{position:fixed;inset:0;z-index:110;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);display:flex;align-items:flex-end}.drive-modal.hidden{display:none}.drive-modal-sheet{width:100%;max-height:88vh;overflow:auto;background:var(--surface);border-radius:25px 25px 0 0;padding:22px 20px calc(30px + var(--safe-bottom))}.drive-modal-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.drive-modal-head h2{margin:5px 0 0;font-size:30px;letter-spacing:-.05em}.drive-close{width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--surface-2);font-size:22px}.drive-stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.drive-stat{padding:16px;background:var(--surface-2);border-radius:14px}.drive-stat span{display:block;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.08em}.drive-stat strong{display:block;margin-top:8px;font-size:25px}.drive-breakdown{margin-top:16px;border-top:1px solid var(--line)}.drive-breakdown-row{display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line);font-size:12px}.drive-breakdown-row span:last-child{font-weight:800}.drive-form label{display:block;margin-bottom:16px;color:var(--muted);font-size:10px}.drive-form input{margin-top:6px}.drive-form .submit-button{margin-top:5px}.drive-note{padding:13px 14px;margin-bottom:16px;background:var(--surface-2);border-radius:12px;color:var(--muted);font-size:10px;line-height:1.5}
        @media(max-width:520px){.drive-insights{grid-template-columns:1fr}.drive-insight{display:grid;grid-template-columns:1fr auto;align-items:center}.drive-insight small{grid-column:1/-1}.drive-stat-grid{grid-template-columns:1fr 1fr}}
        `;
        document.head.appendChild(s);
    }

    function createUI() {
        styles();
        const metricGrid = document.querySelector("#dashboardPage .metric-grid");
        if (metricGrid && !$("driveInsights")) metricGrid.insertAdjacentHTML("afterend", `<div id="driveInsights" class="drive-insights"></div><div id="driveReminder"></div>`);

        if (!$('analyticsModal')) document.body.insertAdjacentHTML('beforeend', `<div id="analyticsModal" class="drive-modal hidden"><div class="drive-modal-sheet"><div class="drive-modal-head"><div><span class="eyebrow">VEHICLE INTELLIGENCE</span><h2>Analytics</h2></div><button class="drive-close" data-drive-close="analyticsModal">×</button></div><div id="analyticsContent"></div></div></div>`);
        if (!$('vehicleSettingsModal')) document.body.insertAdjacentHTML('beforeend', `<div id="vehicleSettingsModal" class="drive-modal hidden"><div class="drive-modal-sheet"><div class="drive-modal-head"><div><span class="eyebrow">VEHICLE PROFILE</span><h2>Vehicle</h2></div><button class="drive-close" data-drive-close="vehicleSettingsModal">×</button></div><div class="drive-note">These details are stored locally on this device. Your odometer will also update automatically when you save a newer fuel reading.</div><form id="vehicleSettingsForm" class="drive-form"><label>Make<input id="vehicleMake" required></label><label>Model<input id="vehicleModel" required></label><label>Year<input id="vehicleYear" type="number" min="1950" max="2100" required></label><label>Engine<input id="vehicleEngine" required></label><label>Current odometer<input id="vehicleOdometer" type="number" min="0" required></label><button class="submit-button" type="submit">SAVE VEHICLE</button></form></div></div>`);

        document.querySelectorAll('[data-drive-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.driveClose)?.classList.add('hidden')));
        const more = document.querySelectorAll('#morePage .settings-list button');
        more.forEach(button => {
            const label = button.textContent.trim().toLowerCase();
            if (label.startsWith('analytics')) button.addEventListener('click', openAnalytics);
            if (label.startsWith('settings')) button.addEventListener('click', openVehicleSettings);
        });
        $('settingsButton')?.addEventListener('click', openVehicleSettings);
        $('vehicleSettingsForm')?.addEventListener('submit', saveVehicleSettings);
    }

    async function getVehicle() { return typeof getActiveVehicle === 'function' ? getActiveVehicle() : null; }
    async function records(name) { return typeof getAllRecords === 'function' ? getAllRecords(name) : []; }

    async function calculate() {
        const vehicle = await getVehicle();
        const id = vehicle?.id;
        const filter = r => !id || r.vehicleId == null || r.vehicleId === id;
        const [fuel, trips, expenses, maintenance] = await Promise.all([records('fuel'), records('trips'), records('expenses'), records('maintenance')]);
        const start = monthStart();
        const inMonth = r => { const d = new Date(r.date || r.startTime || r.createdAt); return !Number.isNaN(d) && d >= start; };
        const mf = fuel.filter(r => filter(r) && inMonth(r));
        const mt = trips.filter(r => filter(r) && inMonth(r));
        const me = expenses.filter(r => filter(r) && inMonth(r));
        const mm = maintenance.filter(r => filter(r) && inMonth(r));
        const fuelCost = mf.reduce((s,r)=>s+Number(r.cost||0),0);
        const expenseCost = me.reduce((s,r)=>s+Number(r.amount||0),0);
        const serviceCost = mm.reduce((s,r)=>s+Number(r.cost||0),0);
        const distance = mt.reduce((s,r)=>s+Number(r.distance||0),0);
        const litres = mf.reduce((s,r)=>s+Number(r.litres||0),0);
        const fuelDistance = mf.reduce((s,r)=>s+Number(r.distance||0),0);
        const economy = fuelDistance > 0 ? litres / fuelDistance * 100 : null;
        const running = fuelCost + expenseCost + serviceCost;
        return {vehicle,fuelCost,expenseCost,serviceCost,distance,litres,economy,running,fuelCount:mf.length,tripCount:mt.length};
    }

    async function refresh() {
        createUI();
        const d = await calculate();
        const insights = $('driveInsights');
        if (insights) insights.innerHTML = `<div class="drive-insight"><span>THIS MONTH</span><strong>${money(d.running)}</strong><small>running cost</small></div><div class="drive-insight"><span>DISTANCE</span><strong>${d.distance.toFixed(1)} km</strong><small>${d.tripCount} recorded drive${d.tripCount===1?'':'s'}</small></div><div class="drive-insight"><span>FUEL SPEND</span><strong>${money(d.fuelCost)}</strong><small>${d.litres.toFixed(1)} L added</small></div>`;
        await refreshReminder(d.vehicle);
    }

    async function refreshReminder(vehicle) {
        const host = $('driveReminder'); if (!host) return;
        const maintenance = (await records('maintenance')).filter(r => !vehicle?.id || r.vehicleId == null || r.vehicleId === vehicle.id).sort((a,b)=>Number(b.odometer||0)-Number(a.odometer||0));
        const last = maintenance[0];
        const odo = Number(vehicle?.odometer||0);
        if (!last) { host.innerHTML = `<div class="drive-reminder"><div><strong>Maintenance baseline needed</strong><span>No service record yet. Add your last service to unlock reminders.</span></div><button type="button" data-reminder-action>ADD SERVICE</button></div>`; host.querySelector('button').onclick=()=>window.DRIVE_MAINTENANCE?.openMaintenance(); return; }
        const interval = Number(last.intervalKm || 10000);
        const dueAt = Number(last.nextServiceOdometer || Number(last.odometer||0)+interval);
        const remaining = dueAt - odo;
        if (remaining <= 0) host.innerHTML = `<div class="drive-reminder"><div><strong>Service due</strong><span>Approximately ${Math.abs(remaining).toLocaleString()} km overdue.</span></div><button type="button" data-reminder-action>SERVICE</button></div>`;
        else if (remaining <= 1500) host.innerHTML = `<div class="drive-reminder"><div><strong>Service coming up</strong><span>${remaining.toLocaleString()} km until the next service.</span></div><button type="button" data-reminder-action>VIEW</button></div>`;
        else host.innerHTML = '';
        host.querySelector('button')?.addEventListener('click',()=>window.DRIVE_MAINTENANCE?.openMaintenance());
    }

    async function openAnalytics() {
        await refresh(); const d = await calculate();
        $('analyticsContent').innerHTML = `<div class="drive-stat-grid"><div class="drive-stat"><span>RUNNING COST</span><strong>${money(d.running)}</strong></div><div class="drive-stat"><span>DISTANCE</span><strong>${d.distance.toFixed(1)} km</strong></div><div class="drive-stat"><span>FUEL ECONOMY</span><strong>${d.economy!=null?d.economy.toFixed(2):'—'}</strong></div><div class="drive-stat"><span>FUEL ENTRIES</span><strong>${d.fuelCount}</strong></div></div><div class="drive-breakdown"><div class="drive-breakdown-row"><span>Fuel</span><span>${money(d.fuelCost)}</span></div><div class="drive-breakdown-row"><span>Other expenses</span><span>${money(d.expenseCost)}</span></div><div class="drive-breakdown-row"><span>Maintenance</span><span>${money(d.serviceCost)}</span></div><div class="drive-breakdown-row"><span>Total this month</span><span>${money(d.running)}</span></div></div>`;
        $('analyticsModal').classList.remove('hidden');
    }

    async function openVehicleSettings() {
        const v = await getVehicle(); if (!v) return;
        $('vehicleMake').value=v.make||''; $('vehicleModel').value=v.model||''; $('vehicleYear').value=v.year||''; $('vehicleEngine').value=v.engine||''; $('vehicleOdometer').value=v.odometer||'';
        $('vehicleSettingsModal').classList.remove('hidden');
    }

    async function saveVehicleSettings(e) {
        e.preventDefault(); const v=await getVehicle(); if(!v)return;
        v.make=$('vehicleMake').value.trim(); v.model=$('vehicleModel').value.trim(); v.name=`${v.make} ${v.model}`.trim(); v.year=Number($('vehicleYear').value); v.engine=$('vehicleEngine').value.trim(); v.odometer=Number($('vehicleOdometer').value); v.updatedAt=new Date().toISOString();
        await putRecord('vehicles',v); $('vehicleSettingsModal').classList.add('hidden'); if(typeof initV06==='function')await initV06(); await refresh();
    }

    function boot(){ createUI(); refresh().catch(console.error); }
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
