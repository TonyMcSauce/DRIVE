/* DRIVE v0.9 — Trip Intelligence */
(() => {
    "use strict";

    const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
    const money = value => `P${Number(value || 0).toFixed(2)}`;
    const km = value => `${Number(value || 0).toFixed(1)} km`;

    function validPoint(point) {
        return point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng));
    }

    function haversine(a, b) {
        if (!validPoint(a) || !validPoint(b)) return 0;
        const R = 6371;
        const dLat = (Number(b.lat) - Number(a.lat)) * Math.PI / 180;
        const dLng = (Number(b.lng) - Number(a.lng)) * Math.PI / 180;
        const lat1 = Number(a.lat) * Math.PI / 180;
        const lat2 = Number(b.lat) * Math.PI / 180;
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }

    function enrichTrip(trip, fuel) {
        const points = Array.isArray(trip.points) ? trip.points.filter(validPoint) : [];
        const start = points[0] || null;
        const end = points.at(-1) || null;
        const startTime = new Date(trip.startTime || trip.createdAt || 0);
        const endTime = new Date(trip.endTime || trip.startTime || trip.createdAt || 0);
        const duration = Math.max(0, endTime - startTime);
        const distance = Number(trip.distance || 0);
        const speeds = points.map(p => Number(p.speed)).filter(v => Number.isFinite(v) && v >= 0).map(v => v * 3.6);
        const gpsDistance = points.length > 1 ? points.slice(1).reduce((sum, point, i) => sum + haversine(points[i], point), 0) : 0;
        const averageSpeed = duration > 0 ? distance / (duration / 3600000) : 0;
        const gpsAverageSpeed = duration > 0 && gpsDistance > 0 ? gpsDistance / (duration / 3600000) : 0;
        const maxSpeed = speeds.length ? Math.max(...speeds) : null;
        const medianPrice = fuel.length ? median(fuel.map(r => Number(r.cost) / Number(r.litres)).filter(Number.isFinite)) : null;
        const economyValues = fuel.map(r => Number(r.economy)).filter(v => Number.isFinite(v) && v > 0);
        const baselineEconomy = economyValues.length >= 3 ? median(economyValues) : null;
        const estimatedLitres = baselineEconomy && distance > 0 ? distance * baselineEconomy / 100 : null;
        const estimatedFuelCost = estimatedLitres != null && medianPrice != null ? estimatedLitres * medianPrice : null;
        return { ...trip, start, end, duration, distance, averageSpeed, gpsAverageSpeed, maxSpeed, gpsDistance, estimatedLitres, estimatedFuelCost, baselineEconomy, medianPrice };
    }

    function median(values) {
        const sorted = [...values].sort((a, b) => a - b);
        if (!sorted.length) return null;
        const middle = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    }

    function bucket(point) {
        if (!validPoint(point)) return null;
        return `${Number(point.lat).toFixed(2)},${Number(point.lng).toFixed(2)}`;
    }

    function commuteProfile(trips) {
        const pairs = new Map();
        trips.forEach(trip => {
            const a = bucket(trip.start), b = bucket(trip.end);
            if (!a || !b || a === b) return;
            const key = `${a}>${b}`;
            pairs.set(key, (pairs.get(key) || 0) + 1);
        });
        const ranked = [...pairs.entries()].sort((a, b) => b[1] - a[1]);
        if (!ranked.length) return { repeated: false, count: 0, route: null };
        const [route, count] = ranked[0];
        return { repeated: count >= 3, count, route };
    }

    async function analyse() {
        const vehicle = await getActiveVehicle();
        const [rawTrips, rawFuel] = await Promise.all([getAllRecords("trips"), getAllRecords("fuel")]);
        const trips = rawTrips.filter(r => !vehicle?.id || r.vehicleId == null || r.vehicleId === vehicle.id)
            .map(r => enrichTrip(r, rawFuel.filter(f => !vehicle?.id || f.vehicleId == null || f.vehicleId === vehicle.id)))
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        const fuel = rawFuel.filter(r => !vehicle?.id || r.vehicleId == null || r.vehicleId === vehicle.id);
        const valid = trips.filter(t => t.distance > 0);
        const totalDistance = valid.reduce((sum, t) => sum + t.distance, 0);
        const totalDuration = valid.reduce((sum, t) => sum + t.duration, 0);
        const avgTrip = valid.length ? totalDistance / valid.length : 0;
        const avgSpeed = totalDuration > 0 ? totalDistance / (totalDuration / 3600000) : 0;
        const commute = commuteProfile(valid);
        const currentMonth = new Date();
        const monthTrips = valid.filter(t => {
            const d = new Date(t.startTime);
            return d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth();
        });
        const monthDistance = monthTrips.reduce((sum, t) => sum + t.distance, 0);
        const monthFuelCost = monthTrips.reduce((sum, t) => sum + (t.estimatedFuelCost || 0), 0);
        return { vehicle, trips, valid, totalDistance, totalDuration, avgTrip, avgSpeed, commute, monthTrips, monthDistance, monthFuelCost };
    }

    function injectStyles() {
        if (document.getElementById("tripIntelStyles")) return;
        const s = document.createElement("style");
        s.id = "tripIntelStyles";
        s.textContent = `
        .trip-intel{margin-top:18px}.trip-intel-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.trip-intel-card{padding:14px;background:var(--surface);border:1px solid var(--line);border-radius:14px}.trip-intel-card span{display:block;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.09em}.trip-intel-card strong{display:block;margin-top:7px;font-size:19px;letter-spacing:-.04em}.trip-intel-card small{display:block;margin-top:4px;color:var(--muted);font-size:9px}.trip-intel-note{margin-top:9px;padding:12px 14px;border-left:2px solid var(--accent);background:var(--surface);border-radius:0 12px 12px 0;font-size:10px;line-height:1.5;color:var(--muted)}
        @media(max-width:720px){.trip-intel-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:380px){.trip-intel-grid{grid-template-columns:1fr}}
        `;
        document.head.appendChild(s);
    }

    function mountDashboard() {
        const dashboard = document.getElementById("dashboardPage");
        const anchor = dashboard?.querySelector(".metric-grid");
        if (!anchor || document.getElementById("tripIntelligence")) return;
        anchor.insertAdjacentHTML("afterend", `<section id="tripIntelligence" class="trip-intel" aria-labelledby="trip-intel-title"><div class="section-title" id="trip-intel-title">TRIP INTELLIGENCE</div><div id="tripIntelGrid" class="trip-intel-grid"></div><div id="tripIntelNote" class="trip-intel-note"></div></section>`);
    }

    function mountTripDetails() {
        const page = document.getElementById("tripsPage");
        if (!page || document.getElementById("tripIntelSummary")) return;
        const anchor = page.querySelector("#tripHistory") || page.querySelector(".empty-state");
        if (!anchor) return;
        const section = document.createElement("section");
        section.id = "tripIntelSummary";
        section.className = "trip-intel";
        section.setAttribute("aria-labelledby", "trip-summary-title");
        section.innerHTML = `<div class="section-title" id="trip-summary-title">DRIVING PROFILE</div><div id="tripProfileGrid" class="trip-intel-grid"></div><div id="tripProfileNote" class="trip-intel-note"></div>`;
        anchor.parentNode.insertBefore(section, anchor);
    }

    function renderDashboard(d) {
        mountDashboard();
        const grid = document.getElementById("tripIntelGrid");
        const note = document.getElementById("tripIntelNote");
        if (!grid) return;
        grid.innerHTML = [
            ["MONTH DISTANCE", km(d.monthDistance), `${d.monthTrips.length} recorded drives`],
            ["AVG DRIVE", km(d.avgTrip), d.valid.length ? "across recorded drives" : "waiting for trip data"],
            ["AVG SPEED", d.avgSpeed ? `${d.avgSpeed.toFixed(0)} km/h` : "—", "moving + stopped time"],
            ["EST. FUEL COST", d.monthFuelCost ? money(d.monthFuelCost) : "—", "based on your fuel baseline"]
        ].map(item => `<article class="trip-intel-card"><span>${item[0]}</span><strong>${esc(item[1])}</strong><small>${esc(item[2])}</small></article>`).join("");
        if (!d.valid.length) note.textContent = "Trip intelligence will activate after you complete your first GPS drive.";
        else if (d.commute.repeated) note.textContent = `DRIVE is seeing a repeated route pattern across ${d.commute.count} drives. This can become your commute baseline as more trips are recorded.`;
        else note.textContent = "Route patterns are still building. Keep using START DRIVE and STOP DRIVE; DRIVE will learn repeated journeys from your GPS history.";
    }

    function renderTripProfile(d) {
        mountTripDetails();
        const grid = document.getElementById("tripProfileGrid");
        const note = document.getElementById("tripProfileNote");
        if (!grid) return;
        const latest = d.valid.at(-1);
        grid.innerHTML = [
            ["LIFETIME DISTANCE", km(d.totalDistance), `${d.valid.length} completed drives`],
            ["AVG SPEED", d.avgSpeed ? `${d.avgSpeed.toFixed(0)} km/h` : "—", "from trip duration"],
            ["LONGEST DRIVE", d.valid.length ? km(Math.max(...d.valid.map(t => t.distance))) : "—", "recorded distance"],
            ["LATEST FUEL COST", latest?.estimatedFuelCost != null ? money(latest.estimatedFuelCost) : "—", latest?.baselineEconomy ? `at ${latest.baselineEconomy.toFixed(2)} L/100 km` : "baseline building"]
        ].map(item => `<article class="trip-intel-card"><span>${item[0]}</span><strong>${esc(item[1])}</strong><small>${esc(item[2])}</small></article>`).join("");
        if (d.commute.repeated) note.textContent = `Repeated-route signal: ${d.commute.count} trips share the same approximate start/end zones. DRIVE can use this later for commute cost and efficiency comparisons.`;
        else if (latest?.maxSpeed != null) note.textContent = `Latest GPS drive peaked at approximately ${latest.maxSpeed.toFixed(0)} km/h. GPS speed can be unavailable on some devices, so this is treated as a telemetry signal, not a calibrated vehicle speed.`;
        else note.textContent = "GPS telemetry is being stored with each drive. More completed trips will improve your driving profile.";
    }

    async function refresh() {
        injectStyles();
        const d = await analyse();
        renderDashboard(d);
        renderTripProfile(d);
    }

    window.DRIVE_TRIP_INTEL = { analyse, refresh, enrichTrip };

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => refresh().catch(error => console.error("DRIVE Trip Intelligence failed", error)), 300);
    });
    window.addEventListener("drive:datachanged", event => {
        if (!event.detail?.store || event.detail.store === "trips" || event.detail.store === "fuel") refresh().catch(error => console.error("DRIVE Trip Intelligence refresh failed", error));
    });
})();
