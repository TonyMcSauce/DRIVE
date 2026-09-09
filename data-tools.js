/* DRIVE v0.6 — local data export/import */
(() => {
    "use strict";
    const $ = id => document.getElementById(id);
    const stores = ["vehicles","fuel","trips","maintenance","expenses","settings"];

    function makeUI() {
        if ($("dataToolsModal")) return;
        const modal = document.createElement("div");
        modal.id = "dataToolsModal";
        modal.className = "modal hidden";
        modal.innerHTML = `<div class="modal-sheet"><div class="modal-handle"></div><div class="modal-header"><div><span class="eyebrow">LOCAL STORAGE</span><h2>Data & Backup</h2></div><button class="modal-close" id="closeDataTools">×</button></div><p style="opacity:.7;line-height:1.5">Your DRIVE records live on this device. Export a backup regularly if you want a portable copy.</p><div class="quick-actions" style="margin-top:20px"><button class="action-button primary" id="exportDriveData"><span class="action-icon">↓</span><span>EXPORT</span></button><button class="action-button" id="importDriveData"><span class="action-icon">↑</span><span>IMPORT</span></button></div><input id="driveImportFile" type="file" accept="application/json" hidden><div id="dataBackupStatus" style="margin-top:16px;font-size:.85rem;opacity:.7"></div></div>`;
        document.body.appendChild(modal);
        $("closeDataTools").onclick = () => modal.classList.add("hidden");
        modal.addEventListener("click", e => { if(e.target === modal) modal.classList.add("hidden"); });
        $("exportDriveData").onclick = exportData;
        $("importDriveData").onclick = () => $("driveImportFile").click();
        $("driveImportFile").onchange = importData;
    }

    async function exportData() {
        const backup = { app:"DRIVE", version:"0.6", exportedAt:new Date().toISOString(), data:{} };
        for (const store of stores) backup.data[store] = await getAllRecords(store);
        const blob = new Blob([JSON.stringify(backup,null,2)], {type:"application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href=url; a.download=`drive-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
        $("dataBackupStatus").textContent = "Backup exported successfully.";
    }

    async function importData(event) {
        const file = event.target.files?.[0]; if(!file)return;
        try {
            const backup = JSON.parse(await file.text());
            if(backup.app !== "DRIVE" || !backup.data) throw new Error("Invalid DRIVE backup");
            for (const store of stores) {
                for (const record of (backup.data[store] || [])) await putRecord(store, record);
            }
            $("dataBackupStatus").textContent = "Backup imported. Your records are now available locally.";
            if(typeof initV06 === "function") await initV06();
            if(typeof loadFuelHistory === "function") await loadFuelHistory();
        } catch(error) {
            console.error(error); $("dataBackupStatus").textContent = "Import failed. Please select a valid DRIVE backup.";
        }
        event.target.value = "";
    }

    function setup() {
        makeUI();
        const buttons=[...document.querySelectorAll("#morePage .settings-list button")];
        const data=buttons.find(b=>b.textContent.trim().toLowerCase().startsWith("data & backup"));
        data?.addEventListener("click",()=>$("dataToolsModal").classList.remove("hidden"));
    }
    document.addEventListener("DOMContentLoaded",setup);
})();
