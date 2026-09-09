/* DRIVE v0.8 — vehicle intelligence dashboard */
(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const money = n => `P${Number(n || 0).toFixed(2)}`;
    const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const dateOf = r => new Date(r?.date || r?.startTime || r?.createdAt || 0);
    const sameVehicle = (r, vehicle) => !vehicle?.id || r.vehicleId == null || r.vehicleId === vehicle.id;
    const monthKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthName = d => d.toLocaleDateString(undefined, { month: "short" });

    async function data() {
        const vehicle = await getActiveVehicle();
        const [fuel, trips, maintenance, expenses] = await Promise.all([
            getAllRecords("fuel"), getAllRecords("trips"), getAllRecords("maintenance"), getAllRecords("expenses")
        ]);
        return { vehicle, fuel:fuel.filter(r=>sameVehicle(r,vehicle)), trips:trips.filter(r=>sameVehicle(r,vehicle)), maintenance:maintenance.filter(r=>sameVehicle(r,vehicle)), expenses:expenses.filter(r=>sameVehicle(r,vehicle)) };
    }

    function injectStyles() {
        if ($("v07Styles")) return;
        const s = document.createElement("style"); s.id = "v07Styles";
        s.textContent = `
        .v07-section{margin:28px 0}.v07-title{display:flex;justify-content:space-between;align-items:end;margin-bottom:12px}.v07-title span{font-size:10px;font-weight:800;letter-spacing:.14em;color:var(--muted)}
        .v07-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.v07-card{padding:16px;background:var(--surface);border:1px solid var(--line);border-radius:16px}.v07-card span{display:block;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.09em}.v07-card strong{display:block;margin-top:9px;font-size:22px;letter-spacing:-.04em}.v07-card small{display:block;margin-top:5px;color:var(--muted);font-size:9px}
        .v07-chart{height:170px;display:flex;align-items:end;gap:8px;padding:18px 10px 0;background:var(--surface);border:1px solid var(--line);border-radius:16px}.v07-bar-wrap{height:100%;flex:1;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:7px}.v07-bar{width:100%;max-width:42px;min-height:3px;background:var(--accent);border-radius:6px 6px 2px 2px;opacity:.85}.v07-bar-wrap small{font-size:8px;color:var(--muted)}
        .v07-health{padding:18px;background:var(--surface);border:1px solid var(--line);border-radius:16px}.v07-health-head{display:flex;justify-content:space-between;align-items:center}.v07-health-score{font-size:32px;font-weight:800;letter-spacing:-.05em}.v07-health-status{font-size:9px;font-weight:900;letter-spacing:.1em;color:var(--accent)}.v07-health-track{height:5px;background:var(--surface-3);border-radius:99px;overflow:hidden;margin:14px 0}.v07-health-fill{height:100%;background:var(--accent);border-radius:inherit}.v07-health-list{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.v07-health-item{padding:11px 12px;background:var(--surface-2);border-radius:11px;font-size:10px;display:flex;justify-content:space-between;gap:10px}.v07-health-item b{font-size:9px}.v07-good{color:var(--accent)}.v07-warn{color:var(--warning)}.v07-danger{color:var(--danger)}
        .v07-drive-summary{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:10px}.v07-big{padding:20px;background:var(--surface);border:1px solid var(--line);border-radius:16px}.v07-big strong{font-size:34px;letter-spacing:-.06em}.v07-big span{display:block;margin-top:6px;color:var(--muted);font-size:9px;letter-spacing:.1em}
        @media(max-width:680px){.v07-grid{grid-template-columns:repeat(2,1fr)}.v07-drive-summary{grid-template-columns:1fr 1fr}.v07-big:first-child{grid-column:1/-1}}@media(max-width:420px){.v07-grid{gap:8px}.v07-card{padding:14px}.v07-health-list{grid-template-columns:1fr}.v07-chart{gap:5px}}
        `; document.head.appendChild(s);
    }

    function mount() {
        injectStyles(); const dashboard=$( "dashboardPage"); const anchor=dashboard?.querySelector(".metric-grid"); if(!anchor||$("v07Dashboard"))return;
        anchor.insertAdjacentHTML("afterend",`<section id="v07Dashboard" class="v07-section"><div class="v07-title"><span>VEHICLE INTELLIGENCE</span></div><div id="v07Kpis" class="v07-grid"></div><div class="v07-title" style="margin-top:24px"><span>MONTHLY FUEL SPEND</span></div><div id="v07Chart" class="v07-chart"></div><div class="v07-title" style="margin-top:24px"><span>DRIVING PROFILE</span></div><div id="v07Driving" class="v07-drive-summary"></div><div class="v07-title" style="margin-top:24px"><span>HEALTH MONITOR</span></div><div id="v07Health"></div></section>`);
    }

    function renderKpis(d) {
        const now=new Date(),key=monthKey(now),mf=d.fuel.filter(r=>monthKey(dateOf(r))===key),mt=d.trips.filter(r=>monthKey(dateOf(r))===key),me=d.expenses.filter(r=>monthKey(dateOf(r))===key),mm=d.maintenance.filter(r=>monthKey(dateOf(r))===key);
        const fuel=mf.reduce((s,r)=>s+Number(r.cost||0),0),other=me.reduce((s,r)=>s+Number(r.amount||0),0),service=mm.reduce((s,r)=>s+Number(r.cost||0),0),distance=mt.reduce((s,r)=>s+Number(r.distance||0),0),litres=mf.reduce((s,r)=>s+Number(r.litres||0),0),fuelDistance=mf.reduce((s,r)=>s+Number(r.distance||0),0),economy=fuelDistance>0?litres/fuelDistance*100:null;
        $("v07Kpis").innerHTML=[["RUNNING COST",money(fuel+other+service),"this month"],["FUEL ECONOMY",economy!=null?economy.toFixed(2):"—","L / 100 KM"],["DISTANCE",distance.toFixed(1),"KM this month"],["FUEL SPEND",money(fuel),`${mf.length} fill-up${mf.length===1?'':'s'}`]].map(x=>`<article class="v07-card"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join("");
    }

    function renderChart(d) {
        const now=new Date(),months=[]; for(let i=5;i>=0;i--)months.push(new Date(now.getFullYear(),now.getMonth()-i,1));
        const vals=months.map(m=>d.fuel.filter(r=>monthKey(dateOf(r))===monthKey(m)).reduce((s,r)=>s+Number(r.cost||0),0)),max=Math.max(...vals,1);
        $("v07Chart").innerHTML=months.map((m,i)=>`<div class="v07-bar-wrap"><div class="v07-bar" title="${money(vals[i])}" style="height:${Math.max(3,vals[i]/max*118)}px"></div><small>${monthName(m)}</small></div>`).join("");
    }

    function renderDriving(d) {
        const distance=d.trips.reduce((s,r)=>s+Number(r.distance||0),0),duration=d.trips.reduce((s,r)=>s+Number(r.duration||0),0),avg=duration>0?distance/(duration/3600000):0;
        $("v07Driving").innerHTML=`<div class="v07-big"><strong>${distance.toFixed(1)} km</strong><span>LIFETIME RECORDED DISTANCE</span></div><div class="v07-big"><strong>${d.trips.length}</strong><span>DRIVES</span></div><div class="v07-big"><strong>${avg?avg.toFixed(0):"—"}</strong><span>AVG KM/H</span></div>`;
    }

    async function renderHealth(d) {
        const now=Date.now(),lastFuel=Math.max(...d.fuel.map(r=>dateOf(r).getTime()),0);
        const service=window.DRIVE_MAINTENANCE?.serviceIntelligence || await window.DRIVE_MAINTENANCE?.intelligence?.();
        let score=100; const issues=[];
        if(!d.fuel.length){score-=15;issues.push(["Fuel data","ADD DATA","warn"])} else if(now-lastFuel>45*86400000){score-=10;issues.push(["Fuel history","STALE","warn"])} else issues.push(["Fuel history","CURRENT","good"]);
        if(!d.maintenance.length){score-=10;issues.push(["Maintenance","BASELINE NEEDED","warn"])}
        else if(service?.status==="overdue"){score-=25;issues.push(["Service","OVERDUE","danger"])}
        else if(service?.status==="due-soon"){score-=10;issues.push(["Service","DUE SOON","warn"])}
        else if(service?.status==="baseline"){score-=5;issues.push(["Service","NO INTERVAL","warn"])}
        else issues.push(["Service","ON TRACK","good"]);
        if(d.trips.length<3){score-=5;issues.push(["GPS history","BUILDING","warn"])} else issues.push(["GPS history","ACTIVE","good"]);
        score=Math.max(0,score); const status=score>=80?"GOOD":score>=60?"WATCH":"ATTENTION";
        $("v07Health").innerHTML=`<div class="v07-health"><div class="v07-health-head"><div><span class="eyebrow">SYSTEM SCORE</span><div class="v07-health-score">${score}<small style="font-size:14px;color:var(--muted)"> / 100</small></div></div><b class="v07-health-status">${status}</b></div><div class="v07-health-track"><div class="v07-health-fill" style="width:${score}%"></div></div><div class="v07-health-list">${issues.map(i=>`<div class="v07-health-item"><span>${esc(i[0])}</span><b class="v07-${i[2]}">${esc(i[1])}</b></div>`).join("")}</div></div>`;
    }

    async function refresh(){mount();const d=await data();renderKpis(d);renderChart(d);renderDriving(d);await renderHealth(d);}
    window.DRIVE_V07={refresh};
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>refresh().catch(console.error));else refresh().catch(console.error);
})();
