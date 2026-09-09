/* DRIVE v0.8 — performance instrumentation */
(function () {
    "use strict";
    const metrics = {};

    function observe(type, handler, options) {
        if (!("PerformanceObserver" in window) || !PerformanceObserver.supportedEntryTypes?.includes(type)) return;
        try {
            const observer = new PerformanceObserver(list => list.getEntries().forEach(handler));
            observer.observe({ type, buffered: true, ...options });
        } catch (error) {
            console.debug("DRIVE performance observer unavailable", type, error);
        }
    }

    observe("largest-contentful-paint", entry => { metrics.LCP = entry.startTime; });
    observe("event", entry => {
        if (entry.interactionId) metrics.INP = Math.max(metrics.INP || 0, entry.duration);
    }, { durationThreshold: 40 });

    window.addEventListener("load", () => {
        setTimeout(() => {
            const navigation = performance.getEntriesByType("navigation")[0];
            metrics.DOMContentLoaded = navigation?.domContentLoadedEventEnd || 0;
            metrics.load = navigation?.loadEventEnd || 0;
            window.DRIVE_PERFORMANCE = { ...metrics, get: () => ({ ...metrics }) };
        }, 0);
    }, { once: true });
})();
