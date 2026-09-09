/* DRIVE v0.31 — Local Data / Backup / Reset */
(() => {
    "use strict";
    const $ = id => document.getElementById(id);
    const stores = ["vehicles","fuel","trips","maintenance","expenses","settings","documents"];
    const recordStores = ["fuel","trips","maintenance","expenses","documents"];
    const label = {fuel:"Fuel",trips:"Trips",maintenance:"Maintenance",expenses:"Expenses",documents:"Documents"};

    function makeUI() {
        if ($("dataToolsModal")) return;
        const modal = document.createElement("div");
        modal.id = "dataToolsModal"; modal.className = "modal hidden"; modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true"); modal.setAttribute("aria-labelledby","data-tools-title");
        modal.innerHTML = `<div class="modal-sheet data-tools-sheet"><div class="modal-handle"></div><div class="modal-header"><div><span class="eyebrow">LOCAL STORAGE</span><h2 id="data-tools-title">Data & Backup</h2></div><button class="modal-close" id="closeDataTools" aria-label="Close data tools">×</button></div><p class="data-tools-intro">DRIVE keeps your records on this device. Back up important data before changing or deleting it.</p><div class="data-tool-actions"><button class="action-button primary" id="exportDriveData"><span>↓</span><span>EXPORT</span></button><button class="action-button" id="importDriveData"><span>↑</span><span>IMPORT</span></button></div><input id="driveImportFile" type="file" accept="application/json" hidden><div class="data-section"><div class="data-section-title">CLEAR RECORDS</div><div class="data-clear-list">${recordStores.map(store=>`<button type="button" class="data-clear-row" data-clear-store="${store}"><span><strong>${label[store]}</strong><small>Delete all ${label[store].toLowerCase()} records</small></span><b>Clear</b></button>`).join("")}</div><button type="button" class="data-danger-button" id="clearAllDriveRecords">CLEAR ALL RECORDS</button></div><div class="data-section data-reset-section"><div class="data-section-title">START FROM SCRATCH</div><p>Factory reset removes all DRIVE data, including your vehicle profile and settings, then creates a fresh default vehicle.</p><button type="button" class="data-danger-button strong" id="factoryResetDrive">FACTORY RESET</button></div><p class="data-tools-note">Documents contain local files and are not included in JSON backups. Export important documents separately.</p><div id="dataBackupStatus" class="data-backup-status" role="status" aria-live="polite"></div></div>`;
        document.body.appendChild(modal);
        $("closeDataTools").onclick = () => modal.classList.add("hidden");
        modal.addEventListener("click", e => { if(e.target === modal) modal.classList.add("hidden"); });
        $("exportDriveData").onclick = exportData;
        $("importDriveData").onclick = () => $("driveImportFile").click();
        $("driveImportFile").onchange = importData;
        modal.querySelectorAll("[data-clear-store]").forEach(button=>button.addEventListener("click",()=>clearOne(button.dataset.clearStore)));
        $("clearAllDriveRecords").onclick = clearAllRecords;
        $("factoryResetDrive").onclick = factoryReset;
    }

    async function exportData() {
        const backup = { app:"DRIVE", version:"0.31", exportedAt:new Date().toISOString(), data:{} };
        for (const store of stores.filter(s=>s!=="documents")) backup.data[store] = await getAllRecords(store);
        const blob = new Blob([JSON.stringify(backup,null,2)], {type:"application/json"});
        const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`drive-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000); $("dataBackupStatus").textContent="Backup exported. Local documents are not part of the JSON backup.";
    }

    async function importData(event) {
        const file=event.target.files?.[0]; if(!file)return;
        try { const backup=JSON.parse(await file.text()); if(backup.app!=="DRIVE"||!backup.data)throw new Error("Invalid DRIVE backup"); for(const store of stores.filter(s=>s!=="documents")){for(const record of (backup.data[store]||[]))await putRecord(store,record)} $("dataBackupStatus").textContent="Backup imported successfully."; window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"import"}})); if(typeof initV06==="function")await initV06(); if(typeof loadFuelHistory==="function")await loadFuelHistory(); }
        catch(error){console.error(error);$("dataBackupStatus").textContent="Import failed. Please select a valid DRIVE backup."}
        event.target.value="";
    }

    async function clearStore(store) {
        const rows=await getAllRecords(store); for(const record of rows){if(store==="documents"&&record.file instanceof Blob){} await deleteRecord(store,record.id)}
    }
    async function clearOne(store) {
        if(!recordStores.includes(store))return;
        const word=label[store].toLowerCase(); if(!confirm(`Delete all ${word} records? This cannot be undone.`))return;
        try { if(store==="trips"&&window.DRIVE_APP?.isTripActive?.())window.DRIVE_APP.stopDrive?.(); await clearStore(store); $("dataBackupStatus").textContent=`All ${word} records cleared.`; window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store}})); if(store==="fuel"&&typeof loadFuelHistory==="function")await loadFuelHistory(); }
        catch(error){console.error(error);$("dataBackupStatus").textContent=`Could not clear ${word}.`}
    }
    async function clearAllRecords() {
        if(!confirm("Delete all fuel, trips, maintenance, expenses and documents? Your vehicle profile will be kept."))return;
        try { for(const store of recordStores)await clearStore(store); $("dataBackupStatus").textContent="All records cleared. Your vehicle profile is still intact."; window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"all-records"}})); if(typeof initV06==="function")await initV06(); }
        catch(error){console.error(error);$("dataBackupStatus").textContent="Could not clear all records."}
    }
    async function factoryReset() {
        const answer=prompt("This deletes ALL DRIVE data. Type DELETE to continue."); if(answer!=="DELETE")return;
        try { if(window.DRIVE_APP?.isTripActive?.())window.DRIVE_APP.stopDrive?.(); for(const store of stores)await clearStore(store); if(typeof ensureDefaultVehicle==="function")await ensureDefaultVehicle(); $("dataBackupStatus").textContent="Factory reset complete. DRIVE is fresh."; window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"factory-reset"}})); setTimeout(()=>window.location.reload(),500); }
        catch(error){console.error(error);$("dataBackupStatus").textContent="Factory reset failed. Your data may be partially changed."}
    }

    function setup() {
        makeUI();
        const buttons=[...document.querySelectorAll("#morePage .settings-list button")];
        const data=buttons.find(b=>b.textContent.trim().toLowerCase().startsWith("data & backup"));
        data?.addEventListener("click",()=>$("dataToolsModal").classList.remove("hidden"));
    }
    window.DRIVE_DATA_TOOLS={clearStore,clearOne,clearAllRecords,factoryReset,exportData,importData};
    document.addEventListener("DOMContentLoaded",setup);
})();
