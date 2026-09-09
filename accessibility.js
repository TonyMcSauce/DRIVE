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

    function installAccessibilityCSS() {
        if (document.getElementById("drive-a11y-css")) return;
        const style = document.createElement("style");
        style.id = "drive-a11y-css";
        style.textContent = `
            .sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
            .skip-link{position:fixed;left:12px;top:8px;z-index:1000;padding:10px 14px;border-radius:9px;background:var(--accent);color:#10120d;font-weight:800;transform:translateY(-160%);transition:transform .15s ease}
            .skip-link:focus{transform:translateY(0);outline:3px solid var(--text);outline-offset:3px}
            :where(button,a,input,select,textarea):focus-visible{outline:3px solid var(--accent);outline-offset:3px}
            :where(button,input,select,textarea){touch-action:manipulation}
            .nav-item,.action-button,.large-action,.submit-button,.stop-button,.icon-button,.modal-close,.settings-list button{min-width:44px}
            @media (prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
        `;
        document.head.appendChild(style);
    }

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
        installAccessibilityCSS();
        setNavigationState();
        document.querySelectorAll(".modal").forEach(enhanceModal);
    }

    let lastFocused = null;

    document.addEventListener("click", event => {
        const button = event.target.closest("button");
        if (!button) return;

        if (button.classList.contains("nav-item")) requestAnimationFrame(setNavigationState);

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

    document.addEventListener("DOMContentLoaded", () => {
        enhance();
        const observer = new MutationObserver(enhance);
        observer.observe(document.body, { childList: true, subtree: true });
    });

    window.DRIVE_A11Y = { refresh: enhance };
})();
