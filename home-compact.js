/* DRIVE v0.44 — Home Command Center */
(function(){
  if(document.getElementById("drive-home-compact-style"))return;
  const style=document.createElement("style");
  style.id="drive-home-compact-style";
  style.textContent=`
    #dashboardPage{padding-top:18px;padding-bottom:22px}
    #dashboardPage .hero{padding:18px 0 16px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px}
    #dashboardPage .hero .eyebrow{margin-bottom:2px}
    #dashboardPage .odometer{margin-top:3px;font-size:clamp(43px,13vw,72px);line-height:.9}
    #dashboardPage .unit{margin:0 0 3px;font-size:9px}
    #dashboardPage .metric-grid{gap:8px;margin:0 0 8px}
    #dashboardPage .metric-card{padding:12px 14px;border-radius:14px;min-height:82px}
    #dashboardPage .metric-card strong{margin-top:6px;font-size:23px}
    #dashboardPage .panel{margin:8px 0 14px;padding:14px 15px;border-radius:15px}
    #dashboardPage .panel h2{margin-top:4px;font-size:27px}
    #dashboardPage .panel h2 small{font-size:12px}
    #dashboardPage .health-bar{margin-top:11px;height:4px}
    #dashboardPage .drive-briefing{margin:0 0 14px}
    #dashboardPage .drive-briefing .panel-header{margin-bottom:8px}
    #dashboardPage .briefing-list{gap:6px}
    #dashboardPage .briefing-item{padding:10px 11px;border-radius:11px}
    #dashboardPage .briefing-item p{margin:5px 0 2px;font-size:12px;line-height:1.35}
    #dashboardPage .briefing-item small{font-size:10px}
    #dashboardPage .briefing-empty{padding:10px 11px}
    #dashboardPage .briefing-empty p{margin-top:4px;font-size:11px}
    #dashboardPage > section[aria-labelledby="quick-actions-title"] .section-title{margin:14px 0 7px}
    #dashboardPage .quick-actions{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
    #dashboardPage .action-button{min-height:52px;border-radius:12px;gap:5px;padding:7px 4px;font-size:8px;letter-spacing:.06em;flex-direction:column}
    #dashboardPage .action-icon{font-size:16px;line-height:1}
    #dashboardPage .drive-button{grid-column:auto;min-height:52px}
    #dashboardPage > section[aria-labelledby="recent-title"]{display:none}
    @media(max-width:480px){
      #dashboardPage{width:min(100% - 24px,900px);padding-top:12px}
      #dashboardPage .hero{padding:14px 0 13px}
      #dashboardPage .odometer{font-size:clamp(40px,13vw,60px)}
      #dashboardPage .metric-card{padding:11px 12px;min-height:76px}
      #dashboardPage .metric-card strong{font-size:21px}
      #dashboardPage .panel{padding:13px 14px}
      #dashboardPage .panel h2{font-size:25px}
      #dashboardPage .action-button{min-height:50px;font-size:7.5px}
    }
    @media(min-width:700px){
      #dashboardPage{max-width:720px}
      #dashboardPage .hero{padding-top:22px}
    }
  `;
  document.head.appendChild(style);
})();
