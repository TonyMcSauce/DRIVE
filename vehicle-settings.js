/* DRIVE v0.8 — vehicle settings */
(function () {
    "use strict";

    let modal;

    const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));

    function ensureModal() {
        if (modal) return modal;
        modal = document.createElement("div");
        modal.id = "vehicleSettingsModal";
        modal.className = "modal hidden";
        modal.innerHTML = `
            <div class="modal-sheet">
                <div class="modal-handle" aria-hidden="true"></div>
                <div class="modal-header">
                    <div><span class="eyebrow">VEHICLE PROFILE</span><h2 id="vehicle-settings-title">Settings</h2></div>
                    <button type="button" class="modal-close" data-settings-close aria-label="Close vehicle settings">×</button>
                </div>
                <form id="vehicleSettingsForm" novalidate>
                    <label for="vehicleNameInput">Vehicle name<input id="vehicleNameInput" maxlength="60" required></label>
                    <label for="vehicleMakeInput">Make<input id="vehicleMakeInput" maxlength="40" required></label>
                    <label for="vehicleModelInput">Model<input id="vehicleModelInput" maxlength="40" required></label>
                    <label for="vehicleYearInput">Year<input id="vehicleYearInput" type="number" inputmode="numeric" min="1886" max="2100" step="1" required></label>
                    <label for="vehicleEngineInput">Engine<input id="vehicleEngineInput" maxlength="40"></label>
                    <label for="vehicleOdometerInput">Current odometer<div class="input-unit"><input id="vehicleOdometerInput" type="number" inputmode="decimal" min="0" max="99999999" step="1" required><span aria-hidden="true">KM</span></div></label>
                    <p id="vehicleSettingsError" class="form-error" role="alert" hidden></p>
                    <button type="submit" class="submit-button">SAVE VEHICLE</button>
                </form>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-settings-close]").addEventListener("click", close);
        modal.querySelector("form").addEventListener("submit", save);
        return modal;
    }

    async function open() {
        const vehicle = await getActiveVehicle();
        if (!vehicle) return;
        const root = ensureModal();
        const values = {
            vehicleNameInput: vehicle.name,
            vehicleMakeInput: vehicle.make,
            vehicleModelInput: vehicle.model,
            vehicleYearInput: vehicle.year,
            vehicleEngineInput: vehicle.engine,
            vehicleOdometerInput: vehicle.odometer
        };
        Object.entries(values).forEach(([id, value]) => { root.querySelector(`#${id}`).value = value ?? ""; });
        root.classList.remove("hidden");
        root.querySelector("#vehicleNameInput")?.focus();
        window.DRIVE_A11Y?.refresh();
    }

    function close() { modal?.classList.add("hidden"); }

    async function save(event) {
        event.preventDefault();
        const vehicle = await getActiveVehicle();
        if (!vehicle) return;
        const name = document.getElementById("vehicleNameInput").value.trim();
        const make = document.getElementById("vehicleMakeInput").value.trim();
        const model = document.getElementById("vehicleModelInput").value.trim();
        const year = Number(document.getElementById("vehicleYearInput").value);
        const engine = document.getElementById("vehicleEngineInput").value.trim();
        const odometer = Number(document.getElementById("vehicleOdometerInput").value);
        const error = document.getElementById("vehicleSettingsError");

        if (!name || !make || !model || !Number.isInteger(year) || year < 1886 || year > 2100 || !Number.isFinite(odometer) || odometer < 0 || odometer > 99999999) {
            error.textContent = "Check the vehicle details and odometer value.";
            error.hidden = false;
            return;
        }
        error.hidden = true;
        Object.assign(vehicle, { name, make, model, year, engine, odometer, updatedAt: new Date().toISOString() });
        await putRecord("vehicles", vehicle);
        close();
        await window.DRIVE_V06?.init?.();
        await window.initV06?.();
        window.DRIVE_V07?.refresh();
        window.DRIVE_A11Y?.refresh();
    }

    function bind() {
        document.getElementById("settingsButton")?.addEventListener("click", open);
        document.querySelectorAll("#morePage .settings-list button").forEach(button => {
            if (button.textContent.trim().startsWith("Settings") && !button.dataset.vehicleSettingsBound) {
                button.dataset.vehicleSettingsBound = "1";
                button.addEventListener("click", open);
            }
        });
    }

    window.DRIVE_VEHICLE_SETTINGS = { open, close };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
    else bind();
})();
