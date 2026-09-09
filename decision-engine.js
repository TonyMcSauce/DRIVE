/* DRIVE v0.27 — Vehicle Decision Engine */
(() => {
  const SEVERITY_WEIGHT = Object.freeze({ attention: 100, watch: 70, info: 35, positive: 15 });
  const SOURCE_WEIGHT = Object.freeze({ predictive: 1.15, anomaly: 1.1, maintenance: 1.2, fuel: 1.05, trip: 1.0, data: 0.9 });

  const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
  const finite = value => Number.isFinite(Number(value));
  const round = (value, digits = 1) => finite(value) ? Number(value).toFixed(digits) : "—";
  const severity = value => Object.prototype.hasOwnProperty.call(SEVERITY_WEIGHT, value) ? value : "info";
  const source = value => Object.prototype.hasOwnProperty.call(SOURCE_WEIGHT, value) ? value : "data";

  function makeDecision({ type, severity: level = "info", title, message, action, why, evidence = {}, confidence = 0.6, source: origin = "data" }) {
    const safeSeverity = severity(level);
    const safeSource = source(origin);
    return {
      id: `${type}-${safeSeverity}`,
      priority: 99,
      severity: safeSeverity,
      type,
      title,
      message,
      action,
      why,
      evidence,
      confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
      source: safeSource
    };
  }

  function fromPredictive(insights = []) {
    return insights.map(item => {
      const type = item.type || "predictive";
      const level = item.severity || "info";
      return makeDecision({
        type,
        severity: level,
        title: item.title || "Vehicle trend",
        message: item.message || "A vehicle trend has been detected.",
        action: item.action || "Review the recorded data before taking action.",
        why: item.why || "The recent vehicle data shows a measurable change.",
        evidence: item.evidence || {},
        confidence: item.confidence ?? 0.72,
        source: "predictive"
      });
    });
  }

  async function collect() {
    const result = { decisions: [], health: null };
    const predictive = window.DRIVE_PREDICTIVE;
    if (predictive?.analyse) {
      try {
        const prediction = await predictive.analyse();
        result.decisions.push(...fromPredictive(prediction?.insights || []));
        result.health = prediction?.health || null;
      } catch (error) { console.warn("DRIVE decision: predictive input unavailable", error); }
    }

    const data = window.DRIVE_DATA;
    if (data?.snapshot) {
      try {
        const snapshot = await data.snapshot();
        const maintenance = window.DRIVE_MAINTENANCE?.intelligence?.(snapshot.maintenance || []);
        if (maintenance) {
          if (maintenance.status === "overdue") result.decisions.push(makeDecision({
            type: "service", severity: "attention", title: "Service is overdue",
            message: `The recorded service interval has been reached${finite(maintenance.kmRemaining) ? ` by ${Math.abs(maintenance.kmRemaining).toLocaleString()} km` : ""}.`,
            action: "Book or perform the required service, then record it in DRIVE.",
            why: "The maintenance record contains an interval that has been reached or passed.",
            evidence: { status: maintenance.status, kmRemaining: maintenance.kmRemaining, daysRemaining: maintenance.daysRemaining },
            confidence: 0.95, source: "maintenance"
          }));
          else if (maintenance.status === "due-soon") result.decisions.push(makeDecision({
            type: "service", severity: "watch", title: "Service is approaching",
            message: `The next recorded service is due soon${finite(maintenance.kmRemaining) ? ` (${Math.max(0, Math.round(maintenance.kmRemaining)).toLocaleString()} km remaining)` : ""}.`,
            action: "Plan the service and keep the next interval updated in DRIVE.",
            why: "The stored maintenance interval is close to its recorded threshold.",
            evidence: { status: maintenance.status, kmRemaining: maintenance.kmRemaining, daysRemaining: maintenance.daysRemaining },
            confidence: 0.9, source: "maintenance"
          }));
        }

        const anomalies = window.DRIVE_ANOMALY?.analyse ? await window.DRIVE_ANOMALY.analyse(snapshot) : null;
        const signals = anomalies?.signals || anomalies?.anomalies || [];
        signals.forEach(signal => {
          const level = signal.severity === "high" ? "attention" : signal.severity === "watch" ? "watch" : signal.severity === "positive" ? "positive" : "info";
          result.decisions.push(makeDecision({
            type: signal.type || "vehicle-signal",
            severity: level,
            title: signal.title || "Vehicle signal",
            message: signal.message || "A change was detected in the recorded vehicle data.",
            action: signal.action || "Review the signal and compare it with your recent records.",
            why: signal.why || "The signal is based on a change in historical vehicle data.",
            evidence: signal.evidence || {},
            confidence: signal.confidence ?? 0.68,
            source: "anomaly"
          }));
        });
      } catch (error) { console.warn("DRIVE decision: data input unavailable", error); }
    }
    return result;
  }

  function canonicalType(type = "") {
    const t = String(type).toLowerCase();
    if (t.includes("service") || t.includes("maintenance")) return "service";
    if (t.includes("fuel") || t.includes("economy") || t.includes("consumption")) return "fuel";
    if (t.includes("cost") || t.includes("spend")) return "cost";
    if (t.includes("trip") || t.includes("drive") || t.includes("route") || t.includes("usage")) return "driving";
    return t || "vehicle";
  }

  function dedupe(decisions) {
    const grouped = new Map();
    decisions.forEach(item => {
      const key = canonicalType(item.type);
      const existing = grouped.get(key);
      if (!existing) { grouped.set(key, item); return; }
      const existingScore = SEVERITY_WEIGHT[existing.severity] + existing.confidence * 10;
      const itemScore = SEVERITY_WEIGHT[item.severity] + item.confidence * 10;
      if (itemScore > existingScore) grouped.set(key, item);
      else if (item.severity === existing.severity && item.message && !existing.message.includes(item.message)) existing.message += ` ${item.message}`;
    });
    return [...grouped.values()];
  }

  function rank(decisions) {
    return dedupe(decisions)
      .map(item => ({ ...item, priorityScore: SEVERITY_WEIGHT[item.severity] * SOURCE_WEIGHT[item.source] + item.confidence * 10 }))
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .map((item, index) => ({ ...item, priority: index + 1 }));
  }

  function render(result) {
    const host = document.getElementById("driveDecision");
    if (!host) return;
    const decisions = result.decisions.slice(0, 3);
    if (!decisions.length) {
      host.innerHTML = `<div class="decision-empty"><span class="decision-kicker">NEXT BEST ACTION</span><strong>Keep recording your drives</strong><p>DRIVE needs a little more history before it can recommend a meaningful next action.</p></div>`;
      return;
    }
    const top = decisions[0];
    const rest = decisions.slice(1);
    host.innerHTML = `<div class="decision-head"><div><span class="decision-kicker">NEXT BEST ACTION</span><h2>${esc(top.title)}</h2></div><span class="decision-severity ${esc(top.severity)}">${esc(top.severity.toUpperCase())}</span></div><p class="decision-message">${esc(top.message)}</p><div class="decision-action"><span>ACTION</span><strong>${esc(top.action)}</strong></div><details class="decision-details"><summary>Why DRIVE is recommending this</summary><p>${esc(top.why)}</p><dl>${Object.entries(top.evidence || {}).filter(([,v]) => v !== undefined && v !== null && v !== "").slice(0,5).map(([key,value]) => `<div><dt>${esc(key.replace(/([A-Z])/g," $1"))}</dt><dd>${esc(typeof value === "number" ? round(value) : value)}</dd></div>`).join("")}</dl></details>${rest.length ? `<div class="decision-more">${rest.map(item => `<div class="decision-row"><span class="decision-severity ${esc(item.severity)}">${esc(item.severity.toUpperCase())}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.message)}</p></div></div>`).join("")}</div>` : ""}`;
  }

  async function refresh() {
    const result = await collect();
    result.decisions = rank(result.decisions);
    render(result);
    return result;
  }

  window.DRIVE_DECISION = { collect, refresh, rank };
  window.addEventListener("drive:datachanged", () => refresh());
  document.addEventListener("DOMContentLoaded", () => setTimeout(() => refresh(), 250));
})();
