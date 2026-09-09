/* DRIVE v0.37 — Trips start action */
(() => {
    "use strict";
    const BUTTON_ID = "tripStartActionV037";
    const getButton = () => document.getElementById(BUTTON_ID);

    function mount() {
        const page = document.getElementById("tripsPage");
        if (!page || getButton()) return;
        const button = document.createElement("button");
        button.type = "button";
        button.id = BUTTON_ID;
        button.className = "large-action trip-start-action";
        button.setAttribute("aria-label", "Start a new drive");
        button.innerHTML = `<span class="action-icon" aria-hidden="true">●</span><span>START DRIVE</span>`;
        button.addEventListener("click", () => window.DRIVE_APP?.startDrive?.());
        const emptyState = page.querySelector(".empty-state");
        const history = page.querySelector("#tripHistory");
        if (emptyState) emptyState.appendChild(button);
        else if (history) history.insertAdjacentElement("beforebegin", button);
        else page.appendChild(button);
        sync();
    }

    function sync() {
        const button = getButton();
        if (!button) return;
        const active = Boolean(window.DRIVE_APP?.isTripActive?.());
        button.disabled = active;
        button.classList.toggle("hidden", active);
        button.innerHTML = active
            ? `<span class="action-icon" aria-hidden="true">●</span><span>DRIVING</span>`
            : `<span class="action-icon" aria-hidden="true">●</span><span>START DRIVE</span>`;
    }

    function refresh() {
        const page = document.getElementById("tripsPage");
        if (!page) return;
        if (!getButton()) mount();
        const button = getButton();
        if (!button) return;
        const history = page.querySelector("#tripHistory");
        const emptyState = page.querySelector(".empty-state");
        const hasHistory = Boolean(history?.children.length);
        if (emptyState && !hasHistory && !emptyState.contains(button)) emptyState.appendChild(button);
        else if (history && hasHistory && !history.contains(button)) history.insertAdjacentElement("beforebegin", button);
        sync();
    }

    window.DRIVE_TRIPS_V37 = { mount, refresh };
    document.addEventListener("DOMContentLoaded", () => {
        mount();
        setTimeout(refresh, 100);
        setTimeout(refresh, 500);
    });
    window.addEventListener("drive:datachanged", refresh);
})();
