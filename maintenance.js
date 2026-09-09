/* DRIVE v0.6 — Maintenance & Expenses */
(() => {
    "use strict";

    let maintenanceModal;
    let expenseModal;

    const $ = id => document.getElementById(id);
    const money = value => `P${Number(value || 0).toFixed(2)}`;

    function today() {
        return new Date().toISOString().split("T")[0];
    }

    function openModal(id) {
        const modal = $(id);
        if (modal) modal.classList.remove("hidden");
    }

    function closeModal(id) {
        const modal = $(id);
        if (modal) modal.classList.add("hidden");
    }

    async function vehicle() {
        return typeof getActiveVehicle === "function" ? getActiveVehicle() : null;
    }

    async function renderMaintenance() {
        const list = $("maintenanceHistory");
        if (!list) return;

        const active = await vehicle();
        const records = (await getAllRecords("maintenance"))
            .filter(r => !active?.id || r.vehicleId == null || r.vehicleId === active.id)
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

        if (!records.length) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔧</div><h2>No service records</h2><p>Keep your maintenance history here so DRIVE can track what was done and when.</p></div>`;
            return;
        }

        list.innerHTML = records.slice(0, 50).map(r => `
            <article class="activity">
                <div class="activity-icon service">🔧</div>
                <div class="activity-info">
                    <strong>${escapeHtml(r.title || r.type || "Maintenance")}</strong>
                    <span>${escapeHtml(r.description || "Service record")} · ${escapeHtml(r.date || "")}</span>
                </div>
                <div class="activity-value">${r.cost != null ? money(r.cost) : "—"}</div>
            </article>
        `).join("");
    }

    async function renderExpenses() {
        const list = $("expenseHistory");
        if (!list) return;

        const active = await vehicle();
        const records = (await getAllRecords("expenses"))
            .filter(r => !active?.id || r.vehicleId == null || r.vehicleId === active.id)
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

        if (!records.length) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">P</div><h2>No expenses</h2><p>Track tyres, repairs, parts, insurance and other vehicle costs here.</p></div>`;
            return;
        }

        list.innerHTML = records.slice(0, 50).map(r => `
            <article class="activity">
                <div class="activity-icon service">P</div>
                <div class="activity-info">
                    <strong>${escapeHtml(r.category || "Expense")}</strong>
                    <span>${escapeHtml(r.description || "Vehicle expense")} · ${escapeHtml(r.date || "")}</span>
                </div>
                <div class="activity-value">${money(r.amount)}</div>
            </article>
        `).join("");
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function saveMaintenance(event) {
        event.preventDefault();
        const active = await vehicle();
        const record = {
            vehicleId: active?.id,
            title: $("maintenanceTitle").value.trim(),
            description: $("maintenanceDescription").value.trim(),
            odometer: Number($("maintenanceOdometer").value || 0),
            cost: Number($("maintenanceCost").value || 0),
            date: $("maintenanceDate").value || today(),
            createdAt: new Date().toISOString(),
            synced: false
        };
        await addRecord("maintenance", record);
        closeModal("maintenanceModal");
        event.target.reset();
        $("maintenanceDate").value = today();
        await refresh();
    }

    async function saveExpense(event) {
        event.preventDefault();
        const active = await vehicle();
        const record = {
            vehicleId: active?.id,
            category: $("expenseCategory").value,
            description: $("expenseDescription").value.trim(),
            amount: Number($("expenseAmount").value || 0),
            odometer: Number($("expenseOdometer").value || 0),
            date: $("expenseDate").value || today(),
            createdAt: new Date().toISOString(),
            synced: false
        };
        await addRecord("expenses", record);
        closeModal("expenseModal");
        event.target.reset();
        $("expenseDate").value = today();
        await refresh();
    }

    async function refresh() {
        await Promise.all([
            renderMaintenance(),
            renderExpenses(),
            typeof renderRecentActivity === "function" ? renderRecentActivity() : Promise.resolve(),
            typeof renderDashboard === "function" ? renderDashboard() : Promise.resolve()
        ]);
    }

    function setup() {
        maintenanceModal = $("maintenanceModal");
        expenseModal = $("expenseModal");

        $("maintenanceForm")?.addEventListener("submit", saveMaintenance);
        $("expenseForm")?.addEventListener("submit", saveExpense);

        $("maintenanceDate")?.setAttribute("value", today());
        if ($("maintenanceDate")) $("maintenanceDate").value = today();
        if ($("expenseDate")) $("expenseDate").value = today();

        $("openMaintenance")?.addEventListener("click", () => { openModal("maintenanceModal"); });
        $("openExpenses")?.addEventListener("click", () => { openModal("expenseModal"); });

        document.querySelectorAll("[data-close]").forEach(button => {
            button.addEventListener("click", () => closeModal(button.dataset.close));
        });

        [maintenanceModal, expenseModal].forEach(modal => {
            modal?.addEventListener("click", event => {
                if (event.target === modal) modal.classList.add("hidden");
            });
        });

        refresh();
    }

    window.DRIVE_MAINTENANCE = { refresh, openMaintenance: () => openModal("maintenanceModal") };
    document.addEventListener("DOMContentLoaded", setup);
})();
