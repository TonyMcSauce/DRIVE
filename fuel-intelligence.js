/* DRIVE v0.9 — Fuel Intelligence */
(() => {
    "use strict";
    const esc = v => String(v ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const money = n => `P${Number(n || 0).toFixed(2)}`;
    const dateOf = r => new Date(r?.date || r?.createdAt || 0);
    const vehicleMatch = (r,v) => !v?.id || r.vehicleId == null || r.vehicleId === v.id;

    async function analyse() {
        const vehicle = await getActiveVehicle();
        const all = (await getAllRecords("fuel")).filter(r => vehicleMatch(r, vehicle)).sort((a,b)=>Number(a.odometer||0)-Number(b.odometer||0));
        const valid = all.filter(r => Number(r.litres)>0 && Number(r.cost)>=0);
        const withDistance = valid.filter(r => Number(r.distance)>0);
        const economies = withDistance.map(r => Number(r.litres)/Number(r.distance)*100).filter(Number.isFinite);
        const prices = valid.map(r => Number(r.cost)/Number(r.litres)).filter(Number.isFinite);
        const avgEconomy = economies.length ? economies.reduce((a,b)=>a+b,0)/economies.length : null;
        const avgPrice = prices.length ? prices.reduce((a,b)=>a+b,0)/prices.length : null;
        const recent = economies.slice(-5);
        const recentEconomy = recent.length ? recent.reduce((a,b)=>a+b,0)/recent.length : null;
        const baseline = economies.length >= 3 ? avgEconomy : null;
        const latest = valid.at(-1) || null;
        const latestPrice = latest && Number(latest.litres)>0 ? Number(latest.cost)/Number(latest.litres) : null;
        const priceDelta = avgPrice && latestPrice != null ? (latestPrice-avgPrice)/avgPrice*100 : null;
        const economyDelta = baseline && recentEconomy != null ? (recentEconomy-baseline)/baseline*100 : null;
        const costs = withDistance.map(r=>Number(r.cost)/Number(r.distance)).filter(Number.isFinite);
        const avgCostPerKm = costs.length ? costs.reduce((a,b)=>a+b,0)/costs.length : null;
        return {vehicle,records:valid,avgEconomy,avgPrice,latestPrice,priceDelta,recentEconomy,economyDelta,avgCostPerKm,baseline};
    }

    function injectStyles(){
        if(document.getElementById("fuelIntelStyles"))return;
        const s=document.createElement("style");s.id="fuelIntelStyles";s.textContent=`
        .fuel-intel{margin-top:18px}.fuel-intel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.fuel-intel-card{padding:14px;background:var(--surface);border:1px solid var(--line);border-radius:14px}.fuel-intel-card span{display:block;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.09em}.fuel-intel-card strong{display:block;margin-top:7px;font-size:19px;letter-spacing:-.04em}.fuel-intel-card small{display:block;margin-top:4px;color:var(--muted);font-size:9px}.fuel-intel-note{margin-top:9px;padding:12px 14px;border-left:2px solid var(--accent);background:var(--surface);border-radius:0 12px 12px 0;font-size:10px;line-height:1.5;color:var(--muted)}
        @media(max-width:560px){.fuel-intel-grid{grid-template-columns:1fr 1fr}.fuel-intel-card:last-child{grid-column:1/-1}}
        `;document.head.appendChild(s);
    }
    function mount(){
        const page=document.getElementById("fuelPage");
        const anchor=page?.querySelector("#fuelHistory");
        if(!anchor||document.getElementById("fuelIntelligence"))return;
        anchor.insertAdjacentHTML("beforebegin",`<section id="fuelIntelligence" class="fuel-intel" aria-labelledby="fuel-intel-title"><div class="section-title" id="fuel-intel-title">FUEL INTELLIGENCE</div><div id="fuelIntelGrid" class="fuel-intel-grid"></div><div id="fuelIntelNote" class="fuel-intel-note"></div></section>`);
    }
    async function refresh(){mount();injectStyles();const d=await analyse();const grid=document.getElementById("fuelIntelGrid"),note=document.getElementById("fuelIntelNote");if(!grid)return;grid.innerHTML=[["AVG ECONOMY",d.avgEconomy!=null?`${d.avgEconomy.toFixed(2)} L/100`:`—`,`based on ${d.records.length} fill-ups`],["FUEL PRICE",d.latestPrice!=null?`${money(d.latestPrice)}/L`:`—`,d.priceDelta!=null?`${d.priceDelta>=0?"+":""}${d.priceDelta.toFixed(1)}% vs avg`:"baseline building"],["FUEL COST / KM",d.avgCostPerKm!=null?money(d.avgCostPerKm):"—","from recorded distances"]].map(x=>`<article class="fuel-intel-card"><span>${x[0]}</span><strong>${esc(x[1])}</strong><small>${esc(x[2])}</small></article>`).join("");
        if(!d.records.length)note.textContent="Fuel intelligence will activate after your first entries.";
        else if(d.economyDelta!=null && d.economyDelta>8)note.textContent=`Consumption is trending ${d.economyDelta.toFixed(1)}% above your baseline. DRIVE will watch the next fill-ups for a persistent change.`;
        else if(d.economyDelta!=null && d.economyDelta<-8)note.textContent=`Consumption is trending ${Math.abs(d.economyDelta).toFixed(1)}% better than your baseline. That is a positive efficiency signal.`;
        else note.textContent=d.baseline?"Consumption is currently within your established baseline range.":"Keep recording fill-ups. DRIVE needs a few entries before it can establish a reliable consumption baseline.";
    }
    window.DRIVE_FUEL_INTEL={analyse,refresh};
})();
