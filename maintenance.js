/* DRIVE v0.6 — Maintenance & Expenses */
(() => {
    "use strict";
    const $ = id => document.getElementById(id);
    const money = value => `P${Number(value || 0).toFixed(2)}`;
    const today = () => new Date().toISOString().split("T")[0];
    const esc = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

    function modal(id, title, eyebrow, body) {
        if ($(id)) return $(id);
        const el = document.createElement("div");
        el.id = id; el.className = "modal hidden";
        el.innerHTML = `<div class="modal-sheet"><div class="modal-handle"></div><div class="modal-header"><div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2></div><button class="modal-close" data-close="${id}">×</button></div>${body}</div>`;
        document.body.appendChild(el);
        el.addEventListener("click", e => { if (e.target === el) el.classList.add("hidden"); });
        el.querySelector("[data-close]").addEventListener("click", () => el.classList.add("hidden"));
        return el;
    }

    function ensureUI() {
        modal("maintenanceModal", "Maintenance", "SERVICE RECORD", `<form id="maintenanceForm">
            <label>Service / repair<input id="maintenanceTitle" type="text" placeholder="Engine oil + filter" required></label>
            <label>Description<input id="maintenanceDescription" type="text" placeholder="What was done?"></label>
            <label>Odometer<div class="input-unit"><input id="maintenanceOdometer" type="number" inputmode="decimal" placeholder="128421"><span>KM</span></div></label>
            <label>Cost<div class="input-unit"><span>P</span><input id="maintenanceCost" type="number" inputmode="decimal" step="0.01" placeholder="1240"></div></label>
            <label>Date<input id="maintenanceDate" type="date" required></label>
            <button class="submit-button" type="submit">SAVE SERVICE RECORD</button>
        </form>`);
        modal("expenseModal", "Expense", "VEHICLE COST", `<form id="expenseForm">
            <label>Category<select id="expenseCategory"><option>Parts</option><option>Tyres</option><option>Repairs</option><option>Insurance</option><option>Licensing</option><option>Other</option></select></label>
            <label>Description<input id="expenseDescription" type="text" placeholder="What did you spend on?"></label>
            <label>Amount<div class="input-unit"><span>P</span><input id="expenseAmount" type="number" inputmode="decimal" step="0.01" placeholder="500"></div></label>
            <label>Odometer<div class="input-unit"><input id="expenseOdometer" type="number" inputmode="decimal"><span>KM</span></div></label>
            <label>Date<input id="expenseDate" type="date" required></label>
            <button class="submit-button" type="submit">SAVE EXPENSE</button>
        </form>`);
    }

    async function activeVehicle() { return typeof getActiveVehicle === "function" ? getActiveVehicle() : null; }
    async function refresh() {
        const vehicle = await activeVehicle();
        const filter = records => records.filter(r => !vehicle?.id || r.vehicleId == null || r.vehicleId === vehicle.id);
        const maintenance = filter(await getAllRecords("maintenance")).sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));
        const expenses = filter(await getAllRecords("expenses")).sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));
        window.DRIVE_MAINTENANCE.lastMaintenance = maintenance;
        window.DRIVE_MAINTENANCE.lastExpenses = expenses;
        if (typeof renderRecentActivity === "function") await renderRecentActivity();
    }

    function setup() {
        ensureUI();
        ["maintenanceDate","expenseDate"].forEach(id => { if ($(id)) $(id).value = today(); });
        $("maintenanceForm").addEventListener("submit", async e => {
            e.preventDefault(); const v=await activeVehicle();
            await addRecord("maintenance", {vehicleId:v?.id,title:$("maintenanceTitle").value.trim(),description:$("maintenanceDescription").value.trim(),odometer:Number($("maintenanceOdometer").value||0),cost:Number($("maintenanceCost").value||0),date:$("maintenanceDate").value,createdAt:new Date().toISOString(),synced:false});
            e.target.reset(); $("maintenanceDate").value=today(); $("maintenanceModal").classList.add("hidden"); await refresh();
        });
        $("expenseForm").addEventListener("submit", async e => {
            e.preventDefault(); const v=await activeVehicle();
            await addRecord("expenses", {vehicleId:v?.id,category:$("expenseCategory").value,description:$("expenseDescription").value.trim(),amount:Number($("expenseAmount").value||0),odometer:Number($("expenseOdometer").value||0),date:$("expenseDate").value,createdAt:new Date().toISOString(),synced:false});
            e.target.reset(); $("expenseDate").value=today(); $("expenseModal").classList.add("hidden"); await refresh();
        });

        const buttons = [...document.querySelectorAll("#morePage .settings-list button")];
        const find = label => buttons.find(b => b.textContent.trim().toLowerCase().startsWith(label));
        find("maintenance")?.addEventListener("click", () => { $("maintenanceModal").classList.remove("hidden"); });
        find("expenses")?.addEventListener("click", () => { $("expenseModal").classList.remove("hidden"); });
        document.querySelector('[data-action="service"]')?.addEventListener("click", () => $("maintenanceModal").classList.remove("hidden"));
        window.DRIVE_MAINTENANCE = { refresh, openMaintenance: () => $("maintenanceModal").classList.remove("hidden"), lastMaintenance: [], lastExpenses: [] };
        refresh();
    }
    document.addEventListener("DOMContentLoaded", setup);
})();
