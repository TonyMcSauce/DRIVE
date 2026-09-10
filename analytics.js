/* DRIVE — Analytics v0.45.1 */
(function () {
  "use strict";

  function byId(id) { return document.getElementById(id); }
  function money(value) { return "P" + Number(value || 0).toFixed(2); }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>\"']/g, function (char) {
      var map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
      return map[char] || char;
    });
  }

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
    "@media(max-width:680px){.analytics-kpis{grid-template-columns:repeat(2,1fr)}}"
  ].join("");

  function ensureStyles() {
    if (byId("analyticsStyles")) return;
    var style = document.createElement("style");
    style.id = "analyticsStyles";
    style.textContent = styles;
    document.head.appendChild(style);
  }

  function mount() {
    ensureStyles();
    var existing = byId("analyticsView");
    if (existing) return existing;

    var main = document.getElementById("main-content");
    if (!main) return null;

    var view = document.createElement("section");
    view.id = "analyticsView";
    view.className = "page analytics-view";
    view.setAttribute("aria-labelledby", "analytics-title");
    view.innerHTML =
      '<div class="page-heading"><span class="eyebrow">VEHICLE INTELLIGENCE</span><h1 id="analytics-title">Analytics</h1></div>' +
      '<div id="analyticsKpis" class="analytics-kpis"></div>' +
      '<div class="analytics-panel"><header><span>RUNNING COST · 6 MONTHS</span></header><div id="analyticsCostChart" class="analytics-bars" role="img" aria-label="Six month running cost chart"></div></div>' +
      '<div class="analytics-panel"><header><span>SPEND BREAKDOWN · THIS MONTH</span></header><div id="analyticsBreakdown" class="analytics-list"></div></div>' +
      '<button type="button" class="large-action analytics-back">BACK TO MORE</button>';

    main.appendChild(view);
    view.querySelector(".analytics-back").addEventListener("click", function () {
      if (typeof window.DRIVE_APP?.showPage === "function") window.DRIVE_APP.showPage("morePage");
    });
    return view;
  }

  async function render() {
    var view = mount();
    if (!view) return;

    var kpis = byId("analyticsKpis");
    var chart = byId("analyticsCostChart");
    var breakdown = byId("analyticsBreakdown");

    if (!window.DRIVE_DATA || typeof window.DRIVE_DATA.intelligence !== "function") {
      if (kpis) kpis.innerHTML = '<div class="analytics-empty">Analytics data is still loading.</div>';
      return;
    }

    try {
      var data = await window.DRIVE_DATA.intelligence();
      data = data || {};
      data.metrics = data.metrics || {};
      data.month = data.month || {};
      data.fuel = Array.isArray(data.fuel) ? data.fuel : [];
      data.expenses = Array.isArray(data.expenses) ? data.expenses : [];
      data.maintenance = Array.isArray(data.maintenance) ? data.maintenance : [];
      data.month.fuel = Array.isArray(data.month.fuel) ? data.month.fuel : [];
      data.month.expenses = Array.isArray(data.month.expenses) ? data.month.expenses : [];
      data.month.maintenance = Array.isArray(data.month.maintenance) ? data.month.maintenance : [];

      var cards = [
        ["TOTAL SPEND", money(data.metrics.totalSpend), "this month"],
        ["COST / KM", data.metrics.costPerKm ? money(data.metrics.costPerKm) : "—", "all running costs"],
        ["DISTANCE", Number(data.metrics.distance || 0).toFixed(1) + " km", "this month"],
        ["FUEL", money(data.metrics.fuelSpend), data.month.fuel.length + " fill-ups"]
      ];
      if (kpis) {
        kpis.innerHTML = cards.map(function (card) {
          return '<article class="analytics-card"><span>' + escapeHtml(card[0]) + '</span><strong>' + escapeHtml(card[1]) + '</strong><small>' + escapeHtml(card[2]) + '</small></article>';
        }).join("");
      }

      var now = new Date();
      var months = [];
      var i;
      for (i = 5; i >= 0; i -= 1) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));

      var records = [];
      data.fuel.forEach(function (r) { records.push([r.date, r.cost]); });
      data.expenses.forEach(function (r) { records.push([r.date, r.amount]); });
      data.maintenance.forEach(function (r) { records.push([r.date, r.cost]); });

      var values = months.map(function (month) {
        var key = window.DRIVE_DATA.monthKey(month);
        return records.filter(function (record) {
          if (!record[0]) return false;
          var date = new Date(record[0]);
          return !Number.isNaN(date.getTime()) && window.DRIVE_DATA.monthKey(date) === key;
        }).reduce(function (sum, record) { return sum + Number(record[1] || 0); }, 0);
      });

      if (chart) {
        var max = Math.max.apply(null, values.concat([1]));
        chart.innerHTML = months.map(function (month, index) {
          var height = Math.max(3, values[index] / max * 145);
          return '<div class="analytics-bar"><i style="height:' + height + 'px" title="' + escapeHtml(money(values[index])) + '"></i><small>' + escapeHtml(month.toLocaleDateString(undefined, { month: "short" })) + '</small></div>';
        }).join("");
      }

      var categories = {};
      data.month.expenses.forEach(function (r) {
        var category = r.category || "Other";
        categories[category] = (categories[category] || 0) + Number(r.amount || 0);
      });
      data.month.maintenance.forEach(function (r) {
        categories.Maintenance = (categories.Maintenance || 0) + Number(r.cost || 0);
      });
      categories.Fuel = Number(data.metrics.fuelSpend || 0);

      var rows = Object.keys(categories).map(function (key) { return [key, categories[key]]; }).sort(function (a, b) { return b[1] - a[1]; });
      if (breakdown) {
        breakdown.innerHTML = rows.length ? rows.map(function (row) {
          return '<div class="analytics-row"><span>' + escapeHtml(row[0]) + '</span><strong>' + money(row[1]) + '</strong></div>';
        }).join("") : '<div class="analytics-empty">No spending recorded this month.</div>';
      }
    } catch (error) {
      console.error("Analytics data load failed", error);
      if (kpis) kpis.innerHTML = '<div class="analytics-empty">Analytics could not load the current data.</div>';
    }
  }

  function openAnalytics() {
    var view = mount();
    if (!view) return;
    document.querySelectorAll(".page").forEach(function (page) { page.classList.remove("active"); });
    view.classList.add("active");
    render();
  }

  function bind() {
    var list = document.querySelector("#morePage .settings-list");
    if (list && !list.dataset.analyticsBound) {
      list.dataset.analyticsBound = "1";
      list.addEventListener("click", function (event) {
        var button = event.target.closest("button");
        if (button && button.textContent.trim().toLowerCase().indexOf("analytics") === 0) {
          event.preventDefault();
          event.stopPropagation();
          openAnalytics();
        }
      });
    }
  }

  window.DRIVE_ANALYTICS = { refresh: render, open: openAnalytics };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
