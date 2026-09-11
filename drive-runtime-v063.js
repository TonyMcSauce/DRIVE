/* DRIVE v0.66 runtime guard */
(function(){
  "use strict";
  const VERSION="0.66";
  let documentsLoading=null;

  function syncVersion(){
    document.querySelectorAll(".version-badge").forEach(el=>el.textContent=`v${VERSION}`);
    document.title=`DRIVE v${VERSION} — Vehicle Intelligence`;
  }

  function loadDocuments(){
    if(window.DRIVE_DOCUMENTS)return Promise.resolve(window.DRIVE_DOCUMENTS);
    if(documentsLoading)return documentsLoading;
    documentsLoading=new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      script.src="./documents.js?v=0.66";
      script.onload=()=>resolve(window.DRIVE_DOCUMENTS||null);
      script.onerror=()=>reject(new Error("documents.js failed to load"));
      document.head.appendChild(script);
    }).catch(error=>{console.error("DRIVE documents loader failed",error);return null;});
    return documentsLoading;
  }

  function bindEndDrive(){
    const button=document.getElementById("stopDriveButton");
    if(!button||button.dataset.drive066Bound)return;
    button.dataset.drive066Bound="1";
    button.addEventListener("click",function(event){
      event.preventDefault();
      event.stopImmediatePropagation();
      const controller=window.DRIVE_TRIP_CONTROLLER;
      if(controller&&typeof controller.finish==="function"){
        Promise.resolve(controller.finish()).catch(error=>console.error("DRIVE END DRIVE failed",error));
      }else{
        console.error("DRIVE END DRIVE: trip controller unavailable");
      }
    },true);
  }

  function boot(){
    syncVersion();
    bindEndDrive();
    loadDocuments();
    setTimeout(()=>{syncVersion();bindEndDrive();loadDocuments();},0);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{capture:true,once:true});
  else boot();

  window.DRIVE_RUNTIME_V063={version:VERSION,syncVersion,bindEndDrive,loadDocuments};
})();
