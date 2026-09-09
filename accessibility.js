/* DRIVE v0.8 — accessibility foundation */
(function () {
    "use strict";

    const FOCUSABLE = [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex=\"-1\"])"
    ].join(",");

    function setNavigationState() {
        document.querySelectorAll(".nav-item").forEach(button => {
            const active = button.classList.contains("active");
            button.setAttribute("aria-current", active ? "page" : "false");
        });
    }

    function enhanceModal(modal) {
        if (!modal || modal.dataset.a11yReady === "true") return;
        modal.dataset.a11yReady = "true";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        const heading = modal.querySelector("h1,h2,h3");
        if (heading) {
            if (!heading.id) heading.id = `dialog-title-${Math.random().toString(36).slice(2, 8)}`;
            modal.setAttribute("aria-labelledby", heading.id);
        }
    }

    function enhance() {
        setNavigationState();
        document.querySelectorAll(".modal, .update-toast").forEach(enhanceModal);
        document.querySelectorAll("button, input, select, textarea, a").forEach(element => {
            if (element.tagName === "BUTTON" && !element.getAttribute("type") && element.closest("form")) {
                element.setAttribute("type", "submit");
            }
        });
    }

    let lastFocused = null;

    document.addEventListener("click", event => {
        const button = event.target.closest("button");
        if (!button) return;

        if (button.classList.contains("nav-item")) {
            requestAnimationFrame(setNavigationState);
        }

        const modal = button.closest(".modal");
        if (modal && !modal.classList.contains("hidden")) lastFocused = button;
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            const modal = [...document.querySelectorAll(".modal:not(.hidden)")].pop();
            if (modal) {
                const close = modal.querySelector("[data-close]");
                close?.click();
                lastFocused?.focus();
            }
            return;
        }

        if (event.key !== "Tab") return;
        const modal = [...document.querySelectorAll(".modal:not(.hidden)")].pop();
        if (!modal) return;

        const focusable = [...modal.querySelectorAll(FOCUSABLE)];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    const observer = new MutationObserver(enhance);
    document.addEventListener("DOMContentLoaded", () => {
        enhance();
        observer.observe(document.body, { childList: true, subtree: true });
    });

    window.DRIVE_A11Y = { refresh: enhance };
})();
