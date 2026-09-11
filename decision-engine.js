/* DRIVE v0.62 — decision engine */
(function(){
  "use strict";
  const esc=value=>String(value??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function collect(){
    const items=[];
    try{
      const watch=window.DRIVE_WATCH?.collect?.()||[];
      if(Array.isArray(watch)) watch.forEach(x=>items.push({...x,source:"WATCH"}));
    }catch(e){ console.warn("DRIVE decision watch read failed",e); }
    try{
      const health=Number(document.getElementById("healthScore")?.textContent);
      if(Number.isFinite(health)&&health<70) items.push({severity:"attention",title:"Vehicle health",message:`Health score is ${health}/100. Review service records.` ,source:"HEALTH"});
    }catch(e){ console.warn("DRIVE decision health read failed",e); }
    return items;
  }
  function rank(items){
    const weight={attention:3,warning:3,watch:2,positive:1,info:1};
    return [...items].sort((a,b)=>(weight[b.severity]||0)-(weight[a.severity]||0));
  }
  function refresh(){
    try{
      const host=document.getElementById("driveDecision");
      if(!host)return;
      const items=rank(collect()).slice(0,5);
      host.innerHTML=items.length?items.map(x=>`<article class="briefing-item severity-${esc(x.severity||"info")}"><div class="briefing-title"><strong>${esc(x.title||"Decision")}</strong><span>${esc(x.source||"DRIVE")}</span></div><p>${esc(x.message||x.text||"")}</p></article>`).join(""):"<div class=\"briefing-empty\"><strong>No decisions yet</strong><p>DRIVE will surface useful actions as your vehicle data builds.</p></div>";
    }catch(e){ console.error("DRIVE decision refresh failed",e); }
  }
  window.DRIVE_DECISION={collect,rank,refresh};
  document.addEventListener("DOMContentLoaded",()=>setTimeout(refresh,0));
  window.addEventListener("drive:datachanged",refresh);
})();
