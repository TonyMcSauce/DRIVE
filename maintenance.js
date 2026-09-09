/* DRIVE v0.8 — Maintenance & Expenses */
(() => {
    "use strict";
    const $ = id => document.getElementById(id);
    const today = () => new Date().toISOString().split("T")[0];
    const LIMITS = { odometer: 99999999, cost: 1000000, title: 120, description: 500 };

    function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value); }
    function validMoney(value) { return Number.isFinite(value) && value >= 0 && value <= LIMITS.cost; }
    function validOdometer(value) { return Number.isFinite(value) && value >= 0 && value <= LIMITS.odometer; }

    function modal(id, title, eyebrow, body) {
        if ($(id)) return $(id);
        const el = document.createElement("div");
        el.id = id; el.className = "modal hidden"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
        el.innerHTML = `<div class="modal-sheet"><div class="modal-handle" aria-hidden="true"></div><div class="modal-header"><div><span class="eyebrow">${eyebrow}</span><h2 id="${id}-title">${title}</h2></div><button type="button" class="modal-close" data-close="${id}" aria-label="Close ${title.toLowerCase()}">×</button></div>${body}</div>`;
        el.setAttribute("aria-labelledby", `${id}-title`);
        document.body.appendChild(el);
        el.addEventListener("click", e => { if (e.target === el) el.classList.add("hidden"); });
        el.querySelector("[data-close]").addEventListener("click", () => el.classList.add("hidden"));
        return el;
    }

    function ensureUI() {
        modal("maintenanceModal", "Maintenance", "SERVICE RECORD", `<form id="maintenanceForm" novalidate>
            <label for="maintenanceTitle">Service / repair<input id="maintenanceTitle" maxlength="120" type="text" placeholder="Engine oil + filter" required></label>
            <label for="maintenanceDescription">Description<input id="maintenanceDescription" maxlength="500" type="text" placeholder="What was done?"></label>
            <label for="maintenanceOdometer">Odometer<div class="input-unit"><input id="maintenanceOdometer" type="number" inputmode="decimal" min="0" max="99999999" step="1" placeholder="128421"><span aria-hidden="true">KM</span></div></label>
            <label for="maintenanceCost">Cost<div class="input-unit"><span aria-hidden="true">P</span><input id="maintenanceCost" type="number" inputmode="decimal" min="0" max="1000000" step="0.01" placeholder="1240"></div></label>
            <label for="maintenanceDate">Date<input id="maintenanceDate" type="date" required></label>
            <p id="maintenanceError" class="form-error" role="alert" hidden></p>
            <button class="submit-button" type="submit">SAVE SERVICE RECORD</button>
        </form>`);
        modal("expenseModal", "Expense", "VEHICLE COST", `<form id="expenseForm" novalidate>
            <label for="expenseCategory">Category<select id="expenseCategory"><option>Parts</option><option>Tyres</option><option>Repairs</option><option>Insurance</option><option>Licensing</option><option>Other</option></select></label>
            <label for="expenseDescription">Description<input id="expenseDescription" maxlength="500" type="text" placeholder="What did you spend on?"></label>
            <label for="expenseAmount">Amount<div class="input-unit"><span aria-hidden="true">P</span><input id="expenseAmount" type="number" inputmode="decimal" min="0" max="1000000" step="0.01" placeholder="500" required></div></label>
            <label for="expenseOdometer">Odometer<div class="input-unit"><input id="expenseOdometer" type="number" inputmode="decimal" min="0" max="99999999" step="1"><span aria-hidden="true">KM</span></div></label>
            <label for="expenseDate">Date<input id="expenseDate" type="date" required></label>
            <p id="expenseError" class="form-error" role="alert" hidden></p>
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
            const title=$( "maintenanceTitle").value.trim(), description=$( "maintenanceDescription").value.trim(), odometer=Number($( "maintenanceOdometer").value||0), cost=Number($( "maintenanceCost").value||0), date=$( "maintenanceDate").value;
            const error=$( "maintenanceError");
            if (!title || title.length > LIMITS.title || description.length > LIMITS.description || !validOdometer(odometer) || !validMoney(cost) || !validDate(date)) { error.textContent="Check the service details and try again."; error.hidden=false; return; }
            error.hidden=true;
            await addRecord("maintenance", {vehicleId:v?.id,title,description,odometer,cost,date,createdAt:new Date().toISOString(),synced:false});
            e.target.reset(); $("maintenanceDate").value=today(); $("maintenanceModal").classList.add("hidden"); await refresh(); window.DRIVE_V07?.refresh(); window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"maintenance"}}));
        });
        $("expenseForm").addEventListener("submit", async e => {
            e.preventDefault(); const v=await activeVehicle();
            const category=$( "expenseCategory").value, description=$( "expenseDescription").value.trim(), amount=Number($( "expenseAmount").value||0), odometer=Number($( "expenseOdometer").value||0), date=$( "expenseDate").value;
            const error=$( "expenseError");
            if (!description || description.length > LIMITS.description || !validMoney(amount) || !validOdometer(odometer) || !validDate(date)) { error.textContent="Check the expense details and try again."; error.hidden=false; return; }
            error.hidden=true;
            await addRecord("expenses", {vehicleId:v?.id,category,description,amount,odometer,date,createdAt:new Date().toISOString(),synced:false});
            e.target.reset(); $("expenseDate").value=today(); $("expenseModal").classList.add("hidden"); await refresh(); window.DRIVE_V07?.refresh(); window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"expenses"}}));
        });

        const buttons = [...document.querySelectorAll("#morePage .settings-list button")];
        const find = label => buttons.find(b => b.textContent.trim().toLowerCase().startsWith(label));
        find("maintenance")?.addEventListener("click", () => { $("maintenanceModal").classList.remove("hidden"); $("maintenanceTitle")?.focus(); });
        find("expenses")?.addEventListener("click", () => { $("expenseModal").classList.remove("hidden"); $("expenseCategory")?.focus(); });
        document.querySelector('[data-action="service"]')?.addEventListener("click", () => { $("maintenanceModal").classList.remove("hidden"); $("maintenanceTitle")?.focus(); });
        window.DRIVE_MAINTENANCE = { refresh, openMaintenance: () => { $("maintenanceModal").classList.remove("hidden"); $("maintenanceTitle")?.focus(); }, lastMaintenance: [], lastExpenses: [] };
        refresh();
    }
    document.addEventListener("DOMContentLoaded", setup);
})();
