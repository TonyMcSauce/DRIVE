/* DRIVE v0.63 runtime guard
   Keeps the visible build number authoritative and makes END DRIVE independent
   of the legacy app.js trip handler. */
(function(){
  "use strict";
  const VERSION="0.63";
  function syncVersion(){
    document.querySelectorAll(".version-badge").forEach(el=>el.textContent=`v${VERSION}`);
    document.title=`DRIVE v${VERSION} — Vehicle Intelligence`;
  }
  function bindEndDrive(){
    const button=document.getElementById("stopDriveButton");
    if(!button || button.dataset.drive063Bound)return;
    button.dataset.drive063Bound="1";
    button.addEventListener("click",function(event){
      event.preventDefault();
      event.stopImmediatePropagation();
      const controller=window.DRIVE_TRIP_CONTROLLER;
      if(controller && typeof controller.finish==="function"){
        Promise.resolve(controller.finish()).catch(error=>console.error("DRIVE v0.63 END DRIVE failed",error));
      }else if(typeof window.DRIVE_APP?.stopDrive==="function"){
        Promise.resolve(window.DRIVE_APP.stopDrive()).catch(error=>console.error("DRIVE legacy END DRIVE failed",error));
      }else{
        console.error("DRIVE END DRIVE: no trip controller available");
      }
    },true);
  }
  syncVersion();
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>{syncVersion();bindEndDrive();},true);
  }else{
    bindEndDrive();
  }
  window.DRIVE_RUNTIME_V063={version:VERSION,syncVersion,bindEndDrive};
})();
