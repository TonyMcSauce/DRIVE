/* DRIVE v0.6 — data-driven UI layer
 * Keeps the v0.5 interaction code intact while moving the visible app
 * onto the persistent vehicle/data architecture.
 */

(() => {
    "use strict";

    let activeVehicle = null;

    const $ = id => document.getElementById(id);

    const money = value => `P${Number(value || 0).toFixed(2)}`;
    const km = value => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
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
        if (Number.isNaN(date.getTime())) return value;
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
        } catch (error) {
            console.error("DRIVE v0.6 initialisation failed:", error);
        }
    }

    async function backfillVehicleIds() {
        if (!activeVehicle?.id) return;

        const [fuel, trips, maintenance, expenses] = await Promise.all([
            getAllRecords("fuel"),
            getAllRecords("trips"),
            getAllRecords("maintenance"),
            getAllRecords("expenses")
        ]);

        for (const record of [...fuel, ...trips, ...maintenance, ...expenses]) {
            if (record.vehicleId == null) {
                record.vehicleId = activeVehicle.id;
                await putRecord(
                    record === fuel.find(x => x.id === record.id) ? "fuel" :
                    record === trips.find(x => x.id === record.id) ? "trips" :
                    record === maintenance.find(x => x.id === record.id) ? "maintenance" : "expenses",
                    record
                );
            }
        }
    }

    async function renderVehicle() {
        if (!activeVehicle) return;

        const name = `${activeVehicle.make || ""} ${activeVehicle.model || ""}`.trim() || activeVehicle.name || "Vehicle";
        const year = activeVehicle.year || "—";
        const engine = activeVehicle.engine || "—";
        const odometer = Number(activeVehicle.odometer || 0);

        document.querySelectorAll(".vehicle-name").forEach(el => {
            el.textContent = `${name.toUpperCase()} · ${year}`;
        });

        const carHeading = document.querySelector("#carPage h1");
        if (carHeading) carHeading.textContent = name;

        const carValues = document.querySelectorAll(".vehicle-details strong");
        if (carValues[0]) carValues[0].textContent = year;
        if (carValues[1]) carValues[1].textContent = engine;
        if (carValues[2]) carValues[2].textContent = km(odometer);

        const hero = $("odometerValue");
        if (hero && odometer) hero.textContent = odometer.toLocaleString();
    }

    async function calculateFuelMetrics() {
        const records = (await getAllRecords("fuel"))
            .filter(r => !activeVehicle?.id || r.vehicleId == null || r.vehicleId === activeVehicle.id)
            .sort((a, b) => Number(a.odometer || 0) - Number(b.odometer || 0));

        if (!records.length) {
            return { economy: null, costPerKm: null, totalCost: 0, totalDistance: 0, count: 0 };
        }

        let totalLitres = 0;
        let totalCost = 0;
        let totalDistance = 0;
        const economies = [];

        for (const record of records) {
            totalLitres += Number(record.litres || 0);
            totalCost += Number(record.cost || 0);
            if (Number(record.distance) > 0) totalDistance += Number(record.distance);
            if (Number(record.economy) > 0) economies.push(Number(record.economy));
        }

        const economy = totalDistance > 0 ? (totalLitres / totalDistance) * 100 :
            economies.length ? economies.reduce((a, b) => a + b, 0) / economies.length : null;

        return {
            economy,
            costPerKm: totalDistance > 0 ? totalCost / totalDistance : null,
            totalCost,
            totalDistance,
            count: records.length
        };
    }

    async function renderDashboard() {
        const metrics = await calculateFuelMetrics();
        const fuelEl = $("fuelEconomy");
        const costEl = $("costPerKm");

        if (fuelEl) fuelEl.textContent = metrics.economy != null ? metrics.economy.toFixed(2) : "—";
        if (costEl) costEl.textContent = metrics.costPerKm != null ? money(metrics.costPerKm) : "—";

        const allTrips = await getAllRecords("trips");
        const tripDistance = allTrips.reduce((sum, trip) => sum + Number(trip.distance || 0), 0);

        const score = calculateHealthScore(metrics, allTrips);
        const scoreEl = $("healthScore");
        const barEl = $("healthBar");
        const statusEl = document.querySelector(".health-status");
        if (scoreEl) scoreEl.textContent = score;
        if (barEl) barEl.style.width = `${score}%`;
        if (statusEl) statusEl.textContent = score >= 80 ? "GOOD" : score >= 60 ? "WATCH" : "ATTENTION";

        // Keep the vehicle odometer authoritative.
        if (activeVehicle?.odometer && $("odometerValue")) {
            $("odometerValue").textContent = Number(activeVehicle.odometer).toLocaleString();
        }

        return { metrics, tripDistance };
    }

    function calculateHealthScore(metrics, trips) {
        // v0.6 deliberately uses a conservative data-availability score rather
        // than pretending to diagnose mechanical condition from sparse data.
        let score = 75;
        if (metrics.count >= 2) score += 5;
        if (metrics.economy != null && metrics.economy > 0 && metrics.economy < 15) score += 5;
        if (trips.length >= 3) score += 5;
        return Math.min(100, score);
    }

    async function renderFuel() {
        const metrics = await calculateFuelMetrics();
        const summary = document.querySelectorAll(".fuel-summary strong");
        if (summary[0]) summary[0].textContent = metrics.economy != null ? metrics.economy.toFixed(2) : "—";
        if (summary[1]) summary[1].textContent = metrics.costPerKm != null ? money(metrics.costPerKm) : "—";

        const records = (await getAllRecords("fuel"))
            .filter(r => !activeVehicle?.id || r.vehicleId == null || r.vehicleId === activeVehicle.id)
            .sort((a, b) => Number(b.odometer || 0) - Number(a.odometer || 0));

        const container = $("fuelHistory");
        if (!container) return;

        if (!records.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">⛽</div><h2>No fuel entries</h2><p>Add your first fill-up to start building your fuel history.</p></div>`;
            return;
        }

        container.innerHTML = records.slice(0, 20).map(record => `
            <article class="activity">
                <div class="activity-icon fuel">⛽</div>
                <div class="activity-info">
                    <strong>${Number(record.litres || 0).toFixed(1)} L</strong>
                    <span>${money(record.cost)} · ${Number(record.odometer || 0).toLocaleString()} km</span>
                    <span>${dateLabel(record.date)}</span>
                </div>
                <div class="activity-value">${record.economy ? `${Number(record.economy).toFixed(2)} L/100` : "—"}</div>
            </article>
        `).join("");
    }

    async function renderTrips() {
        const trips = (await getAllRecords("trips"))
            .filter(r => !activeVehicle?.id || r.vehicleId == null || r.vehicleId === activeVehicle.id)
            .sort((a, b) => new Date(b.startTime || b.createdAt) - new Date(a.startTime || a.createdAt));

        const oldEmpty = document.querySelector("#tripsPage .empty-state");
        if (!oldEmpty) return;

        if (!trips.length) {
            oldEmpty.style.display = "block";
            return;
        }

        oldEmpty.style.display = "none";
        let history = $("tripHistory");
        if (!history) {
            history = document.createElement("div");
            history.id = "tripHistory";
            history.className = "history-list";
            oldEmpty.parentNode.insertBefore(history, oldEmpty);
        }

        history.innerHTML = trips.slice(0, 30).map(trip => {
            const start = new Date(trip.startTime);
            const end = new Date(trip.endTime || trip.startTime);
            const duration = Math.max(0, end - start);
            const distance = Number(trip.distance || 0);
            const averageSpeed = duration > 0 ? distance / (duration / 3600000) : 0;

            return `
                <article class="activity">
                    <div class="activity-icon trip">→</div>
                    <div class="activity-info">
                        <strong>${distance.toFixed(2)} km drive</strong>
                        <span>${dateLabel(trip.startTime)} · ${formatDuration(duration)}</span>
                    </div>
                    <div class="activity-value">${averageSpeed ? `${averageSpeed.toFixed(0)} km/h` : "—"}</div>
                </article>
            `;
        }).join("");
    }

    async function renderRecentActivity() {
        const container = $("recentActivity");
        if (!container) return;

        const [fuel, trips, maintenance, expenses] = await Promise.all([
            getAllRecords("fuel"),
            getAllRecords("trips"),
            getAllRecords("maintenance"),
            getAllRecords("expenses")
        ]);

        const items = [
            ...fuel.map(r => ({ type: "fuel", date: r.date || r.createdAt, title: "Fuel", detail: `${Number(r.litres || 0).toFixed(1)} L · ${money(r.cost)}`, value: `${Number(r.odometer || 0).toLocaleString()} km` })),
            ...trips.map(r => ({ type: "trip", date: r.startTime || r.createdAt, title: "Drive", detail: `${Number(r.distance || 0).toFixed(2)} km · ${formatDuration(new Date(r.endTime || r.startTime) - new Date(r.startTime))}`, value: "" })),
            ...maintenance.map(r => ({ type: "service", date: r.date || r.createdAt, title: r.title || r.type || "Maintenance", detail: r.description || "Service record", value: r.cost != null ? money(r.cost) : "" })),
            ...expenses.map(r => ({ type: "service", date: r.date || r.createdAt, title: r.category || "Expense", detail: r.description || "Vehicle expense", value: r.amount != null ? money(r.amount) : "" }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

        if (!items.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">◌</div><h2>No activity yet</h2><p>Your real vehicle activity will appear here.</p></div>`;
            return;
        }

        const icons = { fuel: "⛽", trip: "→", service: "🔧" };
        container.innerHTML = items.map(item => `
            <article class="activity">
                <div class="activity-icon ${escapeHtml(item.type)}">${icons[item.type]}</div>
                <div class="activity-info">
                    <strong>${escapeHtml(item.title)}</strong>
                    <span>${escapeHtml(item.detail)}</span>
                </div>
                <div class="activity-value">${escapeHtml(item.value)}</div>
            </article>
        `).join("");
    }

    // Existing v0.5 handlers save records correctly. This hook enriches the
    // newly-created record with the active vehicle and refreshes all views.
    document.addEventListener("DOMContentLoaded", () => {
        initV06();

        const fuelForm = $("fuelForm");
        if (fuelForm) {
            fuelForm.addEventListener("submit", async () => {
                setTimeout(async () => {
                    const latest = await getLatestRecord("fuel");
                    if (latest && activeVehicle) {
                        latest.vehicleId = activeVehicle.id;
                        if (Number(latest.odometer) > Number(activeVehicle.odometer || 0)) {
                            activeVehicle.odometer = Number(latest.odometer);
                            await putRecord("vehicles", activeVehicle);
                        }
                        await putRecord("fuel", latest);
                        await renderVehicle();
                        await renderDashboard();
                        await renderFuel();
                        await renderRecentActivity();
                    }
                }, 100);
            });
        }

        const stopButton = $("stopDriveButton");
        if (stopButton) {
            stopButton.addEventListener("click", () => {
                setTimeout(async () => {
                    const latest = await getLatestRecord("trips");
                    if (latest && activeVehicle) {
                        latest.vehicleId = activeVehicle.id;
                        await putRecord("trips", latest);
                        await renderTrips();
                        await renderDashboard();
                        await renderRecentActivity();
                    }
                }, 150);
            });
        }

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") initV06();
        });
    });
})();
