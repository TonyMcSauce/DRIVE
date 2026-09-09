/* DRIVE v0.6 — data-driven UI layer */

(() => {
    "use strict";

    let activeVehicle = null;
    const $ = id => document.getElementById(id);
    const money = value => `P${Number(value || 0).toFixed(2)}`;
    const km = value => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;

    function escapeHtml(value) {
        return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    }

    function formatDuration(ms) {
        const totalMinutes = Math.max(0, Math.round(ms / 60000));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return hours ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes} min`;
    }

    function dateLabel(value) {
        if (!value) return "Unknown date";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    }

    async function initV06() {
        try {
            await openDatabase();
            activeVehicle = await ensureDefaultVehicle();
            await backfillVehicleIds();
            await renderVehicle();
            await renderDashboard();
            await renderFuel();
            await renderTrips();
            await renderRecentActivity();
            mountTripStartAction();
        } catch (error) {
            console.error("DRIVE v0.6 initialisation failed:", error);
        }
    }

    async function backfillVehicleIds() {
        if (!activeVehicle?.id) return;
        for (const storeName of ["fuel", "trips", "maintenance", "expenses"]) {
            const records = await getAllRecords(storeName);
            for (const record of records) {
                if (record.vehicleId == null) {
                    record.vehicleId = activeVehicle.id;
                    await putRecord(storeName, record);
                }
            }
        }
    }

    function mountTripStartAction() {
        const page = $("tripsPage");
        if (!page || $("tripStartButton")) return;

        const history = $("tripHistory");
        const empty = page.querySelector(".empty-state");
        const button = document.createElement("button");
        button.type = "button";
        button.id = "tripStartButton";
        button.className = "large-action trip-start-action";
        button.innerHTML = `<span class="action-icon" aria-hidden="true">●</span><span>START DRIVE</span>`;
        button.addEventListener("click", () => window.DRIVE_APP?.startDrive?.());

        if (history) history.insertAdjacentElement("beforebegin", button);
        else if (empty) empty.insertAdjacentElement("beforebegin", button);
        else page.appendChild(button);
    }

    function syncTripStartAction() {
        const button = $("tripStartButton");
        if (!button) return;
        const active = window.DRIVE_APP?.isTripActive?.();
        button.classList.toggle("hidden", Boolean(active));
        button.disabled = Boolean(active);
        button.innerHTML = active
            ? `<span class="action-icon" aria-hidden="true">●</span><span>DRIVING</span>`
            : `<span class="action-icon" aria-hidden="true">●</span><span>START DRIVE</span>`;
    }

    async function renderVehicle() {
        if (!activeVehicle) return;
        const name = `${activeVehicle.make || ""} ${activeVehicle.model || ""}`.trim() || activeVehicle.name || "Vehicle";
        const year = activeVehicle.year || "—";
        const engine = activeVehicle.engine || "—";
        const odometer = Number(activeVehicle.odometer || 0);

        document.querySelectorAll(".vehicle-name").forEach(el => el.textContent = `${name.toUpperCase()} · ${year}`);
        const carHeading = document.querySelector("#carPage h1");
        if (carHeading) carHeading.textContent = name;
        const carValues = document.querySelectorAll(".vehicle-details strong");
        if (carValues[0]) carValues[0].textContent = year;
        if (carValues[1]) carValues[1].textContent = engine;
        if (carValues[2]) carValues[2].textContent = km(odometer);
        if ($("odometerValue") && odometer) $("odometerValue").textContent = odometer.toLocaleString();
    }

    function belongsToActiveVehicle(record) {
        return !activeVehicle?.id || record.vehicleId == null || record.vehicleId === activeVehicle.id;
    }

    async function calculateFuelMetrics() {
        const records = (await getAllRecords("fuel")).filter(belongsToActiveVehicle).sort((a, b) => Number(a.odometer || 0) - Number(b.odometer || 0));
        if (!records.length) return { economy: null, costPerKm: null, totalCost: 0, totalDistance: 0, count: 0 };

        let totalLitres = 0, totalCost = 0, totalDistance = 0;
        const economies = [];
        for (const record of records) {
            totalLitres += Number(record.litres || 0);
            totalCost += Number(record.cost || 0);
            if (Number(record.distance) > 0) totalDistance += Number(record.distance);
            if (Number(record.economy) > 0) economies.push(Number(record.economy));
        }

        return {
            economy: totalDistance > 0 ? (totalLitres / totalDistance) * 100 : economies.length ? economies.reduce((a, b) => a + b, 0) / economies.length : null,
            costPerKm: totalDistance > 0 ? totalCost / totalDistance : null,
            totalCost, totalDistance, count: records.length
        };
    }

    async function renderDashboard() {
        const metrics = await calculateFuelMetrics();
        if ($("fuelEconomy")) $("fuelEconomy").textContent = metrics.economy != null ? metrics.economy.toFixed(2) : "—";
        if ($("costPerKm")) $("costPerKm").textContent = metrics.costPerKm != null ? money(metrics.costPerKm) : "—";

        const trips = (await getAllRecords("trips")).filter(belongsToActiveVehicle);
        let score = 75;
        if (metrics.count >= 2) score += 5;
        if (metrics.economy != null && metrics.economy > 0 && metrics.economy < 15) score += 5;
        if (trips.length >= 3) score += 5;
        score = Math.min(100, score);

        if ($("healthScore")) $("healthScore").textContent = score;
        if ($("healthBar")) $("healthBar").style.width = `${score}%`;
        const status = document.querySelector(".health-status");
        if (status) status.textContent = score >= 80 ? "GOOD" : score >= 60 ? "WATCH" : "ATTENTION";
        if (activeVehicle?.odometer && $("odometerValue")) $("odometerValue").textContent = Number(activeVehicle.odometer).toLocaleString();
    }

    async function renderFuel() {
        const metrics = await calculateFuelMetrics();
        const summary = document.querySelectorAll(".fuel-summary strong");
        if (summary[0]) summary[0].textContent = metrics.economy != null ? metrics.economy.toFixed(2) : "—";
        if (summary[1]) summary[1].textContent = metrics.costPerKm != null ? money(metrics.costPerKm) : "—";

        const records = (await getAllRecords("fuel")).filter(belongsToActiveVehicle).sort((a, b) => Number(b.odometer || 0) - Number(a.odometer || 0));
        const container = $("fuelHistory");
        if (!container) return;
        if (!records.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">⛽</div><h2>No fuel entries</h2><p>Add your first fill-up to start building your fuel history.</p></div>`;
            return;
        }
        container.innerHTML = records.slice(0, 20).map(record => `
            <article class="activity">
                <div class="activity-icon fuel">⛽</div>
                <div class="activity-info"><strong>${Number(record.litres || 0).toFixed(1)} L</strong><span>${money(record.cost)} · ${Number(record.odometer || 0).toLocaleString()} km</span><span>${dateLabel(record.date)}</span></div>
                <div class="activity-value">${record.economy ? `${Number(record.economy).toFixed(2)} L/100` : "—"}</div>
            </article>
        `).join("");
    }

    async function renderTrips() {
        mountTripStartAction();
        syncTripStartAction();
        const trips = (await getAllRecords("trips"))
            .filter(belongsToActiveVehicle)
            .sort((a, b) => new Date(b.startTime || b.createdAt) - new Date(a.startTime || a.createdAt));
        const oldEmpty = document.querySelector("#tripsPage .empty-state");
        const history = $("tripHistory");
        if (!history) return;

        if (!trips.length) {
            history.innerHTML = "";
            if (oldEmpty) oldEmpty.style.display = "block";
            return;
        }

        if (oldEmpty) oldEmpty.style.display = "none";
        history.innerHTML = trips.map((trip, index) => {
            const start = new Date(trip.startTime || trip.createdAt);
            const end = new Date(trip.endTime || trip.startTime || trip.createdAt);
            const duration = Number(trip.duration) > 0 ? Number(trip.duration) : Math.max(0, end - start);
            const distance = Number(trip.distance || 0);
            const averageSpeed = duration > 0 ? distance / (duration / 3600000) : 0;
            const pointCount = Array.isArray(trip.points) ? trip.points.length : 0;
            const day = start.toLocaleDateString(undefined, { weekday: "short" });
            const time = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
            return `<article class="trip-history-item" data-trip-index="${index}">
                <div class="trip-history-icon" aria-hidden="true">→</div>
                <div class="trip-history-main"><strong>${distance.toFixed(2)} km drive</strong><span>${day}, ${dateLabel(start)} · ${time} · ${formatDuration(duration)}</span></div>
                <div class="trip-history-value"><strong>${averageSpeed ? `${averageSpeed.toFixed(0)} km/h` : "—"}</strong><span>AVG</span></div>
                <div class="trip-history-route">${pointCount ? `${pointCount.toLocaleString()} GPS POINTS RECORDED` : "DISTANCE RECORDED · NO GPS TRACE"}</div>
            </article>`;
        }).join("");
        syncTripStartAction();
    }

    async function renderRecentActivity() {
        const container = $("recentActivity");
        if (!container) return;
        const [fuel, trips, maintenance, expenses] = await Promise.all([getAllRecords("fuel"), getAllRecords("trips"), getAllRecords("maintenance"), getAllRecords("expenses")]);
        const items = [
            ...fuel.filter(belongsToActiveVehicle).map(r => ({ type: "fuel", date: r.date || r.createdAt, title: "Fuel", detail: `${Number(r.litres || 0).toFixed(1)} L · ${money(r.cost)}`, value: `${Number(r.odometer || 0).toLocaleString()} km` })),
            ...trips.filter(belongsToActiveVehicle).map(r => ({ type: "trip", date: r.startTime || r.createdAt, title: "Drive", detail: `${Number(r.distance || 0).toFixed(2)} km · ${formatDuration(new Date(r.endTime || r.startTime) - new Date(r.startTime))}`, value: "" })),
            ...maintenance.filter(belongsToActiveVehicle).map(r => ({ type: "service", date: r.date || r.createdAt, title: r.title || r.type || "Maintenance", detail: r.description || "Service record", value: r.cost != null ? money(r.cost) : "" })),
            ...expenses.filter(belongsToActiveVehicle).map(r => ({ type: "service", date: r.date || r.createdAt, title: r.category || "Expense", detail: r.description || "Vehicle expense", value: r.amount != null ? money(r.amount) : "" }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

        if (!items.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">◌</div><h2>No activity yet</h2><p>Your real vehicle activity will appear here.</p></div>`;
            return;
        }
        const icons = { fuel: "⛽", trip: "→", service: "🔧" };
        container.innerHTML = items.map(item => `<article class="activity"><div class="activity-icon ${escapeHtml(item.type)}">${icons[item.type]}</div><div class="activity-info"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div><div class="activity-value">${escapeHtml(item.value)}</div></article>`).join("");
    }

    document.addEventListener("DOMContentLoaded", () => {
        initV06();

        const fuelForm = $("fuelForm");
        if (fuelForm) fuelForm.addEventListener("submit", () => setTimeout(async () => {
            const latest = await getLatestRecord("fuel");
            if (!latest || !activeVehicle) return;
            latest.vehicleId = activeVehicle.id;
            if (Number(latest.odometer) > Number(activeVehicle.odometer || 0)) {
                activeVehicle.odometer = Number(latest.odometer);
                await putRecord("vehicles", activeVehicle);
            }
            await putRecord("fuel", latest);
            await renderVehicle(); await renderDashboard(); await renderFuel(); await renderRecentActivity();
        }, 200));

        const stopButton = $("stopDriveButton");
        if (stopButton) stopButton.addEventListener("click", () => setTimeout(async () => {
            const latest = await getLatestRecord("trips");
            if (!latest || !activeVehicle) return;
            latest.vehicleId = activeVehicle.id;
            await putRecord("trips", latest);
            await renderTrips(); await renderDashboard(); await renderRecentActivity();
        }, 250));

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") initV06();
        });
    });
})();
