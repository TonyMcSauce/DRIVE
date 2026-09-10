/* DRIVE — Analytics v0.45.5 */
(function () {
  "use strict";

  function byId(id) { return document.getElementById(id); }
  function money(value) { return "P" + Number(value || 0).toFixed(2); }
  function escapeHtml(value) { return String(value == null ? "" : value).replace(/[&<>\"']/g, function (char) { var map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }; return map[char] || char; }); }

  var styles = [
    ".analytics-view{margin-top:18px}",
    ".analytics-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}",
    ".analytics-card,.analytics-panel{background:var(--surface);border:1px solid var(--line);border-radius:16px}",
    ".analytics-card{padding:16px}",
    ".analytics-card span,.analytics-panel>header span{display:block;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.12em}",
    ".analytics-card strong{display:block;margin-top:8px;font-size:23px;letter-spacing:-.04em}",
    ".analytics-card small{display:block;margin-top:4px;color:var(--muted);font-size:9px}",
    ".analytics-panel{padding:16px;margin-top:10px}",
    ".analytics-panel>header{margin-bottom:14px}",
    ".analytics-bars{height:180px;display:flex;align-items:flex-end;gap:7px}",
    ".analytics-bar{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:7px}",
    ".analytics-bar i{display:block;width:min(38px,80%);min-height:3px;background:var(--accent);border-radius:6px 6px 2px 2px}",
    ".analytics-bar small{font-size:8px;color:var(--muted)}",
    ".analytics-list{display:grid;gap:8px}",
    ".analytics-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}",
    ".analytics-row:last-child{border-bottom:0}",
    ".analytics-row strong{font-size:12px}",
    ".analytics-row span{font-size:10px;color:var(--muted)}",
    ".analytics-empty{padding:18px 0;color:var(--muted);font-size:11px;line-height:1.5}",
    ".analytics-loading{display:grid;place-items:center;min-height:260px;text-align:center;border:1px solid var(--line);border-radius:16px;background:var(--surface)}",
    ".analytics-loading-mark{width:34px;height:34px;border:2px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:analyticsSpin .9s linear infinite;margin:0 auto 16px}",
    ".analytics-loading-title{font-size:12px;font-weight:900;letter-spacing:.18em}",
    ".analytics-loading-sub{margin-top:7px;color:var(--muted);font-size:10px;letter-spacing:.05em}",
    ".analytics-loading-dots{display:inline-flex;gap:4px;margin-left:4px}",
    ".analytics-loading-dots i{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.25;animation:analyticsDot 1.2s infinite}",
    ".analytics-loading-dots i:nth-child(2){animation-delay:.18s}.analytics-loading-dots i:nth-child(3){animation-delay:.36s}",
    "@keyframes analyticsSpin{to{transform:rotate(360deg)}}",
    "@keyframes analyticsDot{0%,60%,100%{opacity:.2;transform:translateY(0)}30%{opacity:1;transform:translateY(-2px)}}",
    "@media(max-width:680px){.analytics-kpis{grid-template-columns:repeat(2,1fr)}}"
  ].join("");

  function ensureStyles() { if (byId("analyticsStyles")) return; var style = document.createElement("style"); style.id = "analyticsStyles"; style.textContent = styles; document.head.appendChild(style); }
  function loadingMarkup() { return '<div class="analytics-loading" role="status" aria-live="polite"><div><div class="analytics-loading-mark" aria-hidden="true"></div><div class="analytics-loading-title">ANALYSING<span class="analytics-loading-dots" aria-hidden="true"><i></i><i></i><i></i></span></div><div class="analytics-loading-sub">Reading your vehicle history and calculating insights</div></div></div>'; }
  function showLoading(view) { if (!view) return; if (byId("analyticsLoading")) return; view.dataset.analyticsLoading = "1"; view.innerHTML = '<div class="page-heading"><span class="eyebrow">VEHICLE INTELLIGENCE</span><h1 id="analytics-title">Analytics</h1></div><div id="analyticsLoading">' + loadingMarkup() + '</div>'; }

  function mount() {
    ensureStyles();
    var existing = byId("analyticsView");
    if (existing) { showLoading(existing); return existing; }
    var main = document.getElementById("main-content");
    if (!main) return null;
    var view = document.createElement("section");
    view.id = "analyticsView";
    view.className = "page analytics-view";
    view.setAttribute("aria-labelledby", "analytics-title");
    view.innerHTML = '<div class="page-heading"><span class="eyebrow">VEHICLE INTELLIGENCE</span><h1 id="analytics-title">Analytics</h1></div><div id="analyticsLoading">' + loadingMarkup() + '</div>';
    main.appendChild(view);
    return view;
  }

  function renderShell(view) {
    view.dataset.analyticsLoading = "0";
    view.innerHTML = '<div class="page-heading"><span class="eyebrow">VEHICLE INTELLIGENCE</span><h1 id="analytics-title">Analytics</h1></div><div id="analyticsKpis" class="analytics-kpis"></div><div class="analytics-panel"><header><span>RUNNING COST · 6 MONTHS</span></header><div id="analyticsCostChart" class="analytics-bars" role="img" aria-label="Six month running cost chart"></div></div><div class="analytics-panel"><header><span>SPEND BREAKDOWN · THIS MONTH</span></header><div id="analyticsBreakdown" class="analytics-list"></div></div><button type="button" class="large-action analytics-back">BACK TO MORE</button>';
    var back = view.querySelector(".analytics-back");
    if (back) back.addEventListener("click", function () { window.DRIVE_APP?.showPage?.("morePage"); });
  }

  var renderInFlight = false;
  var refreshQueued = false;

  async function render(attempt, startedAt) {
    attempt = Number(attempt || 0); startedAt = Number(startedAt || Date.now());
    var view = mount();
    if (!view || !view.classList.contains("active")) return;
    if (renderInFlight) { refreshQueued = true; return; }
    renderInFlight = true;
    try {
      var elapsed = Date.now() - startedAt;
      if (typeof openDatabase === "function") { try { await openDatabase(); } catch (error) { console.error("Analytics database readiness failed", error); } }
      if (!window.DRIVE_DATA || typeof window.DRIVE_DATA.intelligence !== "function") {
        if (elapsed < 5000 && attempt < 50) { renderInFlight = false; setTimeout(function () { render(attempt + 1, startedAt); }, 100); return; }
        var wait = byId("analyticsLoading"); if (wait) wait.innerHTML = '<div class="analytics-empty">Analytics is taking longer than expected. Please try again.</div>'; return;
      }
      var data = await window.DRIVE_DATA.intelligence();
      data = data || {}; data.metrics = data.metrics || {}; data.month = data.month || {};
      data.fuel = Array.isArray(data.fuel) ? data.fuel : []; data.expenses = Array.isArray(data.expenses) ? data.expenses : []; data.maintenance = Array.isArray(data.maintenance) ? data.maintenance : [];
      data.month.fuel = Array.isArray(data.month.fuel) ? data.month.fuel : []; data.month.expenses = Array.isArray(data.month.expenses) ? data.month.expenses : []; data.month.maintenance = Array.isArray(data.month.maintenance) ? data.month.maintenance : [];
      if (!view.classList.contains("active")) return;
      renderShell(view);
      var kpis = byId("analyticsKpis"), chart = byId("analyticsCostChart"), breakdown = byId("analyticsBreakdown");
      var cards = [["TOTAL SPEND", money(data.metrics.totalSpend), "this month"],["COST / KM", data.metrics.costPerKm ? money(data.metrics.costPerKm) : "—", "all running costs"],["DISTANCE", Number(data.metrics.distance || 0).toFixed(1) + " km", "this month"],["FUEL", money(data.metrics.fuelSpend), data.month.fuel.length + " fill-ups"]];
      if (kpis) kpis.innerHTML = cards.map(function (card) { return '<article class="analytics-card"><span>' + escapeHtml(card[0]) + '</span><strong>' + escapeHtml(card[1]) + '</strong><small>' + escapeHtml(card[2]) + '</small></article>'; }).join("");
      var now = new Date(), months = [], i; for (i = 5; i >= 0; i -= 1) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
      var records = []; data.fuel.forEach(function (r) { records.push([r.date, r.cost]); }); data.expenses.forEach(function (r) { records.push([r.date, r.amount]); }); data.maintenance.forEach(function (r) { records.push([r.date, r.cost]); });
      var values = months.map(function (month) { var key = window.DRIVE_DATA.monthKey(month); return records.filter(function (record) { if (!record[0]) return false; var date = new Date(record[0]); return !Number.isNaN(date.getTime()) && window.DRIVE_DATA.monthKey(date) === key; }).reduce(function (sum, record) { return sum + Number(record[1] || 0); }, 0); });
      if (chart) { var max = Math.max.apply(null, values.concat([1])); chart.innerHTML = months.map(function (month, index) { var height = Math.max(3, values[index] / max * 145); return '<div class="analytics-bar"><i style="height:' + height + 'px" title="' + escapeHtml(money(values[index])) + '"></i><small>' + escapeHtml(month.toLocaleDateString(undefined, { month: "short" })) + '</small></div>'; }).join(""); }
      var categories = {}; data.month.expenses.forEach(function (r) { var category = r.category || "Other"; categories[category] = (categories[category] || 0) + Number(r.amount || 0); }); data.month.maintenance.forEach(function (r) { categories.Maintenance = (categories.Maintenance || 0) + Number(r.cost || 0); }); categories.Fuel = Number(data.metrics.fuelSpend || 0);
      var rows = Object.keys(categories).map(function (key) { return [key, categories[key]]; }).sort(function (a, b) { return b[1] - a[1]; });
      if (breakdown) breakdown.innerHTML = rows.length ? rows.map(function (row) { return '<div class="analytics-row"><span>' + escapeHtml(row[0]) + '</span><strong>' + money(row[1]) + '</strong></div>'; }).join("") : '<div class="analytics-empty">No spending recorded this month.</div>';
    } catch (error) {
      console.error("Analytics data load failed", error);
      if (Date.now() - startedAt < 5000 && attempt < 50) { renderInFlight = false; setTimeout(function () { render(attempt + 1, startedAt); }, 150); return; }
      var failed = byId("analyticsLoading"); if (failed) failed.innerHTML = '<div class="analytics-empty">Analytics could not load the current data.</div>';
    } finally {
      renderInFlight = false;
      if (refreshQueued) { refreshQueued = false; if (byId("analyticsView")?.classList.contains("active")) requestAnimationFrame(function () { render(0, Date.now()); }); }
    }
  }

  function openAnalytics() {
    var view = mount(); if (!view) return;
    document.querySelectorAll(".page").forEach(function (page) { page.classList.remove("active"); });
    view.classList.add("active"); showLoading(view);
    requestAnimationFrame(function () { render(0, Date.now()); });
  }

  function bind() {
    var list = document.querySelector("#morePage .settings-list");
    if (list && !list.dataset.analyticsBound) {
      list.dataset.analyticsBound = "1";
      list.addEventListener("click", function (event) {
        var button = event.target.closest("button");
        if (!button || !list.contains(button)) return;
        if (button.textContent.trim().toLowerCase().indexOf("analytics") !== 0) return;
        event.preventDefault(); event.stopPropagation(); openAnalytics();
      });
    }
  }

  window.DRIVE_ANALYTICS = {
    refresh: function () { if (byId("analyticsView")?.classList.contains("active")) render(0, Date.now()); },
    open: openAnalytics
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mount(); bind(); if (byId("analyticsView")?.classList.contains("active")) openAnalytics(); }, { once: true });
  else { mount(); bind(); if (byId("analyticsView")?.classList.contains("active")) openAnalytics(); }
})();
