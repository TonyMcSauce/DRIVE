/* DRIVE v0.8 — centralized data layer */
(() => {
    "use strict";
    const cache = new Map();
    const TTL = 1500;

    const sameVehicle = (r, v) => !v?.id || r.vehicleId == null || r.vehicleId === v.id;
    const dateOf = r => new Date(r?.date || r?.startTime || r?.createdAt || 0);
    const monthKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    async function records(store) {
        const hit = cache.get(store);
        if (hit && Date.now() - hit.time < TTL) return hit.data;
        const data = await getAllRecords(store);
        cache.set(store, { time: Date.now(), data });
        return data;
    }

    function invalidate(store) {
        if (store) cache.delete(store); else cache.clear();
    }

    async function snapshot() {
        const vehicle = await getActiveVehicle();
        const [fuel, trips, maintenance, expenses] = await Promise.all([
            records("fuel"), records("trips"), records("maintenance"), records("expenses")
        ]);
        return {
            vehicle,
            fuel: fuel.filter(r => sameVehicle(r, vehicle)),
            trips: trips.filter(r => sameVehicle(r, vehicle)),
            maintenance: maintenance.filter(r => sameVehicle(r, vehicle)),
            expenses: expenses.filter(r => sameVehicle(r, vehicle))
        };
    }

    function emit(store) {
        invalidate(store);
        window.dispatchEvent(new CustomEvent("drive:datachanged", { detail: { store } }));
    }

    function currentMonth(d = new Date()) {
        const key = monthKey(d);
        return {
            key,
            fuel: [], trips: [], maintenance: [], expenses: []
        };
    }

    async function intelligence() {
        const d = await snapshot();
        const month = currentMonth();
        for (const type of ["fuel", "trips", "maintenance", "expenses"]) {
            month[type] = d[type].filter(r => monthKey(dateOf(r)) === month.key);
        }
        const fuelSpend = month.fuel.reduce((s,r)=>s+Number(r.cost||0),0);
        const expenseSpend = month.expenses.reduce((s,r)=>s+Number(r.amount||0),0);
        const maintenanceSpend = month.maintenance.reduce((s,r)=>s+Number(r.cost||0),0);
        const distance = month.trips.reduce((s,r)=>s+Number(r.distance||0),0);
        const litres = month.fuel.reduce((s,r)=>s+Number(r.litres||0),0);
        const fuelDistance = month.fuel.reduce((s,r)=>s+Number(r.distance||0),0);
        const totalSpend = fuelSpend + expenseSpend + maintenanceSpend;
        return {
            ...d, month,
            metrics: {
                fuelSpend, expenseSpend, maintenanceSpend, totalSpend, distance, litres,
                economy: fuelDistance > 0 ? litres / fuelDistance * 100 : null,
                costPerKm: distance > 0 ? totalSpend / distance : null,
                fuelCostPerKm: fuelDistance > 0 ? fuelSpend / fuelDistance : null
            }
        };
    }

    window.DRIVE_DATA = { records, invalidate, snapshot, intelligence, emit, dateOf, monthKey };
    window.addEventListener("drive:datachanged", event => invalidate(event.detail?.store));
})();
