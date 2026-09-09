/* DRIVE v0.8 — analytics */
(() => {
    "use strict";
    const $ = id => document.getElementById(id);
    const money = n => `P${Number(n||0).toFixed(2)}`;
    const esc = v => String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
    const styles = `
      .analytics-view{margin-top:18px}.analytics-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.analytics-card,.analytics-panel{background:var(--surface);border:1px solid var(--line);border-radius:16px}.analytics-card{padding:16px}.analytics-card span,.analytics-panel>header span{display:block;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.12em}.analytics-card strong{display:block;margin-top:8px;font-size:23px;letter-spacing:-.04em}.analytics-card small{display:block;margin-top:4px;color:var(--muted);font-size:9px}.analytics-panel{padding:16px;margin-top:10px}.analytics-panel>header{margin-bottom:14px}.analytics-bars{height:180px;display:flex;align-items:end;gap:7px}.analytics-bar{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:end;align-items:center;height:100%;gap:7px}.analytics-bar i{display:block;width:min(38px,80%);min-height:3px;background:var(--accent);border-radius:6px 6px 2px 2px}.analytics-bar small{font-size:8px;color:var(--muted)}.analytics-list{display:grid;gap:8px}.analytics-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}.analytics-row:last-child{border-bottom:0}.analytics-row strong{font-size:12px}.analytics-row span{font-size:10px;color:var(--muted)}
      @media(max-width:680px){.analytics-kpis{grid-template-columns:repeat(2,1fr)}}
    `;
    function mount(){
        if($("analyticsView")) return;
        const style=document.createElement("style");style.id="analyticsStyles";style.textContent=styles;document.head.appendChild(style);
        const page=$("morePage"); if(!page)return;
        const view=document.createElement("section");view.id="analyticsView";view.className="analytics-view hidden";view.setAttribute("aria-labelledby","analytics-title");
        view.innerHTML=`<div class="page-heading"><span class="eyebrow">VEHICLE INTELLIGENCE</span><h1 id="analytics-title">Analytics</h1></div><div id="analyticsKpis" class="analytics-kpis"></div><div class="analytics-panel"><header><span>RUNNING COST · 6 MONTHS</span></header><div id="analyticsCostChart" class="analytics-bars" role="img" aria-label="Six month running cost chart"></div></div><div class="analytics-panel"><header><span>SPEND BREAKDOWN · THIS MONTH</span></header><div id="analyticsBreakdown" class="analytics-list"></div></div>`;
        page.parentNode.appendChild(view);
        const back=document.createElement("button");back.type="button";back.className="large-action analytics-back";back.textContent="BACK TO MORE";back.addEventListener("click",()=>{view.classList.add("hidden");page.classList.add("active");});view.appendChild(back);
        const buttons=[...page.querySelectorAll(".settings-list button")];buttons.find(b=>b.textContent.trim().toLowerCase().startsWith("analytics"))?.addEventListener("click",()=>{page.classList.remove("active");view.classList.remove("hidden");render();});
    }
    async function render(){mount();const d=await DRIVE_DATA.intelligence();const now=new Date(),months=[];for(let i=5;i>=0;i--)months.push(new Date(now.getFullYear(),now.getMonth()-i,1));
        const values=months.map(m=>{const k=DRIVE_DATA.monthKey(m);return [...d.fuel.map(r=>[r.date,r.cost]),...d.expenses.map(r=>[r.date,r.amount]),...d.maintenance.map(r=>[r.date,r.cost])].filter(x=>DRIVE_DATA.monthKey(new Date(x[0]))===k).reduce((s,x)=>s+Number(x[1]||0),0)});const max=Math.max(...values,1);
        $("analyticsKpis").innerHTML=[["TOTAL SPEND",money(d.metrics.totalSpend),"this month"],["COST / KM",d.metrics.costPerKm?money(d.metrics.costPerKm):"—","all running costs"],["DISTANCE",`${d.metrics.distance.toFixed(1)} km`,"this month"],["FUEL",money(d.metrics.fuelSpend),`${d.month.fuel.length} fill-ups`]].map(x=>`<article class="analytics-card"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join("");
        $("analyticsCostChart").innerHTML=months.map((m,i)=>`<div class="analytics-bar"><i style="height:${Math.max(3,values[i]/max*145)}px" title="${money(values[i])}"></i><small>${m.toLocaleDateString(undefined,{month:"short"})}</small></div>`).join("");
        const cats=new Map();d.month.expenses.forEach(r=>cats.set(r.category,(cats.get(r.category)||0)+Number(r.amount||0));d.month.maintenance.forEach(r=>cats.set("Maintenance",(cats.get("Maintenance")||0)+Number(r.cost||0)));cats.set("Fuel",(cats.get("Fuel")||0)+d.metrics.fuelSpend);const rows=[...cats.entries()].sort((a,b)=>b[1]-a[1]);$("analyticsBreakdown").innerHTML=rows.length?rows.map(([k,v])=>`<div class="analytics-row"><span>${esc(k)}</span><strong>${money(v)}</strong></div>`).join(""): `<div class="analytics-row"><span>No spending recorded this month</span><strong>—</strong></div>`;
    }
    window.DRIVE_ANALYTICS={refresh:render};
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",()=>{mount();},{once:true});
    else mount();
})();
