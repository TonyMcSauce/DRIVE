/* DRIVE v0.62 — vehicle watch */
(function(){
  "use strict";
  function collect(){
    const items=[];
    try{
      const health=Number(document.getElementById("healthScore")?.textContent);
      if(Number.isFinite(health)&&health<80) items.push({severity:health<60?"attention":"watch",title:"Vehicle health",message:`Health score is ${health}/100.`});
    }catch(e){console.warn("DRIVE watch health read failed",e);}
    return items;
  }
  function renderHome(){
    try{
      const host=document.getElementById("driveWatch");
      if(!host)return;
      const items=collect();
      host.innerHTML=items.length?items.map(x=>`<article class="briefing-item severity-${x.severity}"><div class="briefing-title"><strong>${String(x.title||"Watch")}</strong><span>WATCH</span></div><p>${String(x.message||"")}</p></article>`).join(""):"<div class=\"briefing-empty\"><strong>Everything looks normal</strong><p>DRIVE will watch for changes as more vehicle data is recorded.</p></div>";
    }catch(e){console.error("DRIVE watch render failed",e);}
  }
  function renderAnalytics(){return renderHome();}
  function refresh(){renderHome();}
  function init(){refresh();}
  window.DRIVE_WATCH={collect,renderHome,renderAnalytics,refresh,init};
  document.addEventListener("DOMContentLoaded",()=>setTimeout(init,0));
})();
