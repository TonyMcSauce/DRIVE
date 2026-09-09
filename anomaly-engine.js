/* DRIVE v0.9 — Vehicle Anomaly Engine */
(() => {
    "use strict";

    const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

    const median = values => {
        const a = values.filter(Number.isFinite).sort((x, y) => x - y);
        if (!a.length) return null;
        const m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    };

    const vehicleMatch = (record, vehicle) => !vehicle?.id || record.vehicleId == null || record.vehicleId === vehicle.id;

    async function analyse() {
        const vehicle = await getActiveVehicle();
        const [fuelRaw, tripsRaw, maintenanceRaw] = await Promise.all([
            getAllRecords("fuel"), getAllRecords("trips"), getAllRecords("maintenance")
        ]);
        const fuel = fuelRaw.filter(r => vehicleMatch(r, vehicle));
        const trips = tripsRaw.filter(r => vehicleMatch(r, vehicle));
        const maintenance = maintenanceRaw.filter(r => vehicleMatch(r, vehicle));
        const anomalies = [];

        const economies = fuel.map(r => Number(r.economy)).filter(v => Number.isFinite(v) && v > 0);
        const baselineEconomy = economies.length >= 3 ? median(economies) : null;
        const recentEconomies = fuel.slice().sort((a,b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)).slice(-3)
            .map(r => Number(r.economy)).filter(v => Number.isFinite(v) && v > 0);
        const recentEconomy = recentEconomies.length ? recentEconomies.reduce((a,b) => a+b,0) / recentEconomies.length : null;
        if (baselineEconomy && recentEconomy) {
            const delta = (recentEconomy - baselineEconomy) / baselineEconomy * 100;
            if (delta > 12) anomalies.push({type:"fuel", severity:"watch", title:"Fuel consumption rising", detail:`Recent consumption is ${delta.toFixed(1)}% above your baseline.`, value:delta});
            else if (delta < -12) anomalies.push({type:"fuel", severity:"positive", title:"Fuel efficiency improving", detail:`Recent consumption is ${Math.abs(delta).toFixed(1)}% better than baseline.`, value:delta});
        }

        const validTrips = trips.filter(r => Number(r.distance) > 0 && new Date(r.startTime || r.createdAt).getTime());
        if (validTrips.length >= 4) {
            const speeds = validTrips.map(r => {
                const duration = new Date(r.endTime || r.startTime) - new Date(r.startTime);
                return duration > 0 ? Number(r.distance) / (duration / 3600000) : null;
            }).filter(v => Number.isFinite(v) && v > 0);
            const baselineSpeed = median(speeds);
            const latest = speeds.at(-1);
            if (baselineSpeed && latest && latest > baselineSpeed * 1.3) anomalies.push({type:"trip",severity:"info",title:"Latest trip was faster",detail:`Average trip speed was ${latest.toFixed(0)} km/h versus a ${baselineSpeed.toFixed(0)} km/h historical median.`,value:latest});
            if (baselineSpeed && latest && latest < baselineSpeed * 0.7) anomalies.push({type:"trip",severity:"watch",title:"Latest trip was slower",detail:`Average trip speed was ${latest.toFixed(0)} km/h versus a ${baselineSpeed.toFixed(0)} km/h historical median.`,value:latest});
        }

        const odometer = Number(vehicle?.odometer || 0);
        const dated = maintenance.map(r => ({r, date:new Date(r.nextServiceDate || 0).getTime(), odo:Number(r.nextServiceOdometer || 0)})).filter(x => x.date || x.odo);
        if (dated.length) {
            const candidates = dated.filter(x => (x.odo && odometer >= x.odo) || (x.date && Date.now() >= x.date));
            if (candidates.length) anomalies.push({type:"maintenance",severity:"high",title:"Service attention required",detail:"A recorded maintenance interval appears to have been reached or passed.",value:candidates.length});
        }

        const recentTrips = validTrips.slice().sort((a,b)=>new Date(b.startTime)-new Date(a.startTime)).slice(0,10);
        const oldTrips = validTrips.slice().sort((a,b)=>new Date(b.startTime)-new Date(a.startTime)).slice(10,20);
        const avg = arr => arr.length ? arr.reduce((s,r)=>s+Number(r.distance||0),0)/arr.length : null;
        if (recentTrips.length >= 5 && oldTrips.length >= 5) {
            const recentAvg = avg(recentTrips), oldAvg = avg(oldTrips);
            if (oldAvg && recentAvg > oldAvg * 1.35) anomalies.push({type:"usage",severity:"info",title:"Driving distance is increasing",detail:`Your recent trips average ${recentAvg.toFixed(1)} km versus ${oldAvg.toFixed(1)} km previously.`,value:recentAvg});
        }

        return {vehicle, anomalies, baselineEconomy, recentEconomy};
    }

    function styles() {
        if (document.getElementById("anomalyStyles")) return;
        const s = document.createElement("style"); s.id="anomalyStyles"; s.textContent=`
        .anomaly-engine{margin-top:18px}.anomaly-list{display:grid;gap:8px}.anomaly-item{display:grid;grid-template-columns:8px 1fr auto;gap:11px;align-items:start;padding:13px 14px;background:var(--surface);border:1px solid var(--line);border-radius:14px}.anomaly-dot{width:7px;height:7px;border-radius:50%;margin-top:5px;background:var(--muted)}.anomaly-item.watch .anomaly-dot,.anomaly-item.high .anomaly-dot{background:var(--accent)}.anomaly-item.positive .anomaly-dot{background:var(--accent)}.anomaly-item strong{display:block;font-size:11px}.anomaly-item p{margin:4px 0 0;color:var(--muted);font-size:10px;line-height:1.45}.anomaly-tag{font-size:8px;font-weight:800;letter-spacing:.08em;color:var(--muted)}.anomaly-empty{padding:14px;background:var(--surface);border:1px solid var(--line);border-radius:14px;color:var(--muted);font-size:10px;line-height:1.5}@media(max-width:560px){.anomaly-item{grid-template-columns:7px 1fr}.anomaly-tag{grid-column:2}}
        `; document.head.appendChild(s);
    }

    function mount() {
        const dashboard = document.getElementById("dashboardPage");
        const anchor = dashboard?.querySelector(".metric-grid");
        if (!anchor || document.getElementById("anomalyEngine")) return;
        anchor.insertAdjacentHTML("afterend", `<section id="anomalyEngine" class="anomaly-engine" aria-labelledby="anomaly-title"><div class="section-title" id="anomaly-title">VEHICLE SIGNALS</div><div id="anomalyList" class="anomaly-list"></div></section>`);
    }

    async function refresh() {
        styles(); mount();
        const list = document.getElementById("anomalyList"); if (!list) return;
        const d = await analyse();
        if (!d.anomalies.length) { list.innerHTML=`<div class="anomaly-empty">No unusual signals detected yet. DRIVE is still establishing your vehicle's normal patterns.</div>`; return; }
        list.innerHTML=d.anomalies.slice(0,4).map(a=>`<article class="anomaly-item ${esc(a.severity)}"><div class="anomaly-dot" aria-hidden="true"></div><div><strong>${esc(a.title)}</strong><p>${esc(a.detail)}</p></div><div class="anomaly-tag">${esc(a.severity.toUpperCase())}</div></article>`).join("");
    }

    window.DRIVE_ANOMALY = {analyse, refresh};
    document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>refresh().catch(console.error),450));
    window.addEventListener("drive:datachanged",()=>refresh().catch(console.error));
})();
