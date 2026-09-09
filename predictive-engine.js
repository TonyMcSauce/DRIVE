/* DRIVE v0.26 — Predictive Intelligence Engine */
(() => {
    "use strict";

    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const median = values => {
        const a = values.filter(Number.isFinite).sort((x, y) => x - y);
        if (!a.length) return null;
        const m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    };
    const avg = values => {
        const a = values.filter(Number.isFinite);
        return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
    };
    const pct = (value, base) => base ? ((value - base) / base) * 100 : null;
    const round = (value, places = 1) => Number.isFinite(value) ? Number(value.toFixed(places)) : null;
    const money = value => Number.isFinite(value) ? `P${value.toFixed(0)}` : "—";

    function recentFuel(fuel) {
        return fuel
            .filter(r => Number.isFinite(Number(r.economy)) && Number(r.economy) > 0 && Number(r.economy) < 40)
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    }

    function fuelForecast(data) {
        const fuel = recentFuel(data.fuel);
        if (fuel.length < 3) return null;
        const recent = avg(fuel.slice(0, 3).map(r => Number(r.economy)));
        const baseline = median(fuel.slice(3, 9).map(r => Number(r.economy)));
        if (!baseline || !recent) return null;
        const change = pct(recent, baseline);
        if (Math.abs(change) < 5) return {
            id: "fuel-stable", severity: "info", type: "fuel-trend", title: "FUEL TREND",
            message: `Recent consumption is broadly stable at ${round(recent, 1)} L/100 km.`,
            action: "Keep logging fuel entries to strengthen the baseline.",
            evidence: { recentEconomy: round(recent, 2), baselineEconomy: round(baseline, 2), changePercent: round(change, 1) },
            confidence: "medium", source: "predictive-engine"
        };
        if (change > 0) {
            return {
                id: "fuel-rising", severity: change >= 12 ? "attention" : "watch", type: "fuel-trend", title: "FUEL TREND",
                message: `Recent consumption is ${Math.abs(change).toFixed(1)}% above your baseline (${round(recent, 1)} vs ${round(baseline, 1)} L/100 km).`,
                action: "Check tyre pressures and driving conditions at your next stop; keep logging fuel.",
                evidence: { recentEconomy: round(recent, 2), baselineEconomy: round(baseline, 2), changePercent: round(change, 1) },
                confidence: fuel.length >= 6 ? "high" : "medium", source: "predictive-engine"
            };
        }
        return {
            id: "fuel-improving", severity: "positive", type: "fuel-trend", title: "FUEL TREND",
            message: `Recent consumption is ${Math.abs(change).toFixed(1)}% better than your baseline.`,
            action: "Keep the conditions that produced this result consistent where practical.",
            evidence: { recentEconomy: round(recent, 2), baselineEconomy: round(baseline, 2), changePercent: round(change, 1) },
            confidence: fuel.length >= 6 ? "high" : "medium", source: "predictive-engine"
        };
    }

    function maintenanceForecast(data) {
        const maintenance = [...data.maintenance].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        const scheduled = maintenance.find(r => Number(r.nextServiceOdometer) > 0 || r.nextServiceDate);
        if (!scheduled) return null;
        const odo = Number(data.vehicle?.odometer);
        const target = Number(scheduled.nextServiceOdometer);
        const kmRemaining = target > 0 && odo > 0 ? target - odo : null;
        const daysRemaining = scheduled.nextServiceDate ? Math.ceil((new Date(scheduled.nextServiceDate) - new Date()) / 86400000) : null;
        const overdueKm = Number.isFinite(kmRemaining) && kmRemaining <= 0;
        const overdueDate = Number.isFinite(daysRemaining) && daysRemaining < 0;
        const soonKm = Number.isFinite(kmRemaining) && kmRemaining <= 500;
        const soonDate = Number.isFinite(daysRemaining) && daysRemaining <= 30;
        let severity = "info";
        if (overdueKm || overdueDate) severity = "attention";
        else if (soonKm || soonDate) severity = "watch";
        let message = "Service timing is being tracked.";
        if (overdueKm || overdueDate) message = `A recorded service interval appears overdue${overdueKm ? ` by ${Math.abs(kmRemaining).toLocaleString()} km` : ""}${overdueDate ? ` / ${Math.abs(daysRemaining)} days` : ""}.`;
        else if (soonKm || soonDate) message = `Next recorded service is approaching${soonKm ? ` in about ${Math.max(0, kmRemaining).toLocaleString()} km` : ""}${soonDate ? ` / ${Math.max(0, daysRemaining)} days` : ""}.`;
        else if (Number.isFinite(kmRemaining)) message = `Next recorded service is approximately ${kmRemaining.toLocaleString()} km away.`;
        return {
            id: "maintenance-forecast", severity, type: "maintenance", title: "SERVICE FORECAST", message,
            action: severity === "attention" ? "Review the service record and schedule the work." : "Keep the service interval updated after each service.",
            evidence: { nextServiceOdometer: target || null, nextServiceDate: scheduled.nextServiceDate || null, kmRemaining: round(kmRemaining, 0), daysRemaining },
            confidence: "high", source: "predictive-engine"
        };
    }

    function drivingTrend(data) {
        const trips = [...data.trips].filter(t => Number(t.distance) > 0).sort((a, b) => new Date(b.endTime || b.createdAt) - new Date(a.endTime || a.createdAt));
        if (trips.length < 6) return null;
        const recent = avg(trips.slice(0, 3).map(t => Number(t.distance)));
        const previous = avg(trips.slice(3, 6).map(t => Number(t.distance)));
        if (!recent || !previous) return null;
        const change = pct(recent, previous);
        if (Math.abs(change) < 15) return { id: "driving-stable", severity: "info", type: "driving-trend", title: "DRIVING TREND", message: "Recent trip lengths are broadly consistent with your previous trips.", action: "Keep recording drives to build a stronger usage profile.", evidence: { recentAverageKm: round(recent, 1), previousAverageKm: round(previous, 1), changePercent: round(change, 1) }, confidence: "medium", source: "predictive-engine" };
        return { id: "driving-change", severity: change > 0 ? "watch" : "info", type: "driving-trend", title: "DRIVING TREND", message: `Your recent average trip length is ${Math.abs(change).toFixed(1)}% ${change > 0 ? "higher" : "lower"} than the previous set.`, action: change > 0 ? "Expect higher fuel and running costs if this usage continues." : "Your recent usage is lighter than before.", evidence: { recentAverageKm: round(recent, 1), previousAverageKm: round(previous, 1), changePercent: round(change, 1) }, confidence: "medium", source: "predictive-engine" };
    }

    function costForecast(data) {
        const now = new Date();
        const months = new Map();
        for (const r of [...data.fuel, ...data.expenses, ...data.maintenance]) {
            const d = new Date(r.date || r.createdAt);
            if (Number.isNaN(d.getTime())) continue;
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            months.set(key, (months.get(key) || 0) + Number(r.cost ?? r.amount ?? 0));
        }
        const values = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3).map(x => x[1]);
        if (values.length < 2) return null;
        const forecast = avg(values);
        const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
        const current = months.get(currentKey) || 0;
        return {
            id: "cost-forecast", severity: "info", type: "cost", title: "COST FORECAST",
            message: `Recent monthly running cost averages about ${money(forecast)}.`,
            action: current > forecast * 1.15 ? `This month is currently above that recent average by about ${money(current - forecast)}.` : "Keep logging fuel, service and expenses to improve the estimate.",
            evidence: { recentMonthlyAverage: round(forecast, 2), currentMonth: round(current, 2), monthsUsed: values.length },
            confidence: values.length >= 3 ? "medium" : "low", source: "predictive-engine"
        };
    }

    function healthScore(data, insights) {
        let score = 100;
        const fuel = recentFuel(data.fuel);
        if (!fuel.length) score -= 12;
        const fuelSignal = insights.find(i => i.type === "fuel-trend");
        if (fuelSignal?.severity === "attention") score -= 15;
        else if (fuelSignal?.severity === "watch") score -= 8;
        const maintenanceSignal = insights.find(i => i.type === "maintenance");
        if (maintenanceSignal?.severity === "attention") score -= 25;
        else if (maintenanceSignal?.severity === "watch") score -= 10;
        if (data.trips.length < 3) score -= 5;
        const daysSinceFuel = fuel[0] ? (Date.now() - new Date(fuel[0].date || fuel[0].createdAt)) / 86400000 : Infinity;
        if (daysSinceFuel > 45) score -= 10;
        score = clamp(Math.round(score), 0, 100);
        const status = score >= 80 ? "GOOD" : score >= 60 ? "WATCH" : "ATTENTION";
        return { score, status };
    }

    async function analyse() {
        const data = await window.DRIVE_DATA.snapshot();
        const insights = [fuelForecast(data), maintenanceForecast(data), drivingTrend(data), costForecast(data)].filter(Boolean).map(i => ({ ...i, createdAt: new Date().toISOString() }));
        const health = healthScore(data, insights);
        return { data, insights, health };
    }

    function briefingItems(result) {
        const rank = { attention: 0, watch: 1, info: 2, positive: 3 };
        return [...result.insights].sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9)).slice(0, 3);
    }

    function render(result) {
        const host = document.getElementById("driveBriefing");
        if (!host) return;
        const items = briefingItems(result);
        host.innerHTML = `<div class="panel-header"><div><span class="eyebrow">DRIVE INTELLIGENCE</span><h2>DRIVE BRIEFING</h2></div><span class="briefing-confidence">LOCAL</span></div><div class="briefing-list">${items.length ? items.map(i => `<article class="briefing-item severity-${i.severity}"><div class="briefing-title"><strong>${i.title}</strong><span>${i.severity.toUpperCase()}</span></div><p>${i.message}</p><small>${i.action}</small></article>`).join("") : `<div class="briefing-empty"><strong>Building your baseline</strong><p>Log more fuel, drives and service records and DRIVE will start identifying trends.</p></div>`}</div>`;
    }

    async function refresh() {
        try {
            const result = await analyse();
            render(result);
            const score = document.getElementById("healthScore");
            const bar = document.getElementById("healthBar");
            const status = document.querySelector(".health-status");
            if (score) score.textContent = result.health.score;
            if (bar) { bar.style.width = `${result.health.score}%`; bar.parentElement?.setAttribute("aria-valuenow", result.health.score); }
            if (status) status.textContent = result.health.status;
            return result;
        } catch (error) {
            console.error("DRIVE predictive intelligence failed", error);
            return null;
        }
    }

    window.DRIVE_PREDICTIVE = { analyse, refresh, briefingItems };
    window.addEventListener("drive:datachanged", () => refresh());
    document.addEventListener("DOMContentLoaded", () => setTimeout(refresh, 0));
})();
