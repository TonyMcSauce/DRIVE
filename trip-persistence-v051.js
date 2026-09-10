/* DRIVE v0.51 — Offline-first trip persistence */
(function(){
  "use strict";
  const ACTIVE_KEY="activeDrive";
  const CHECKPOINT_MS=5000;
  let active=null;
  let persistTimer=null;
  let recovering=false;

  const $=id=>document.getElementById(id);
  const iso=ms=>new Date(ms).toISOString();
  const emit=()=>window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"trips"}}));

  async function saveActive(){
    if(!active)return;
    try{await putRecord("settings",{key:ACTIVE_KEY,value:active});}catch(error){console.error("DRIVE active trip checkpoint failed",error)}
  }

  function scheduleCheckpoint(){
    if(persistTimer)return;
    persistTimer=setTimeout(async()=>{persistTimer=null;await saveActive();},CHECKPOINT_MS);
  }

  function setDrivingUI(on){
    $("tripLiveCard")?.classList.toggle("hidden",!on);
    $("tripStartButton")?.classList.toggle("hidden",on);
    const button=$("startDriveButton");
    if(button)button.innerHTML=on?'<span class="action-icon" aria-hidden="true">●</span><span>DRIVING</span>':'<span class="action-icon" aria-hidden="true">●</span><span>START DRIVE</span>';
    if(on)window.DRIVE_APP?.showPage?.("tripsPage");
  }

  function announce(message){
    const status=$("networkStatus")||$("recentActivity");
    if(status){status.setAttribute("aria-label",message);status.dataset.message=message;}
  }

  async function start(){
    if(active)return;
    const vehicle=typeof getActiveVehicle==="function"?await getActiveVehicle():null;
    active={
      id:crypto.randomUUID?crypto.randomUUID():`drive-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      vehicleId:vehicle?.id,
      startTime:iso(Date.now()),
      startMs:Date.now(),
      points:[],
      distance:0,
      status:"ACTIVE",
      recovered:false,
      lastCheckpoint:iso(Date.now())
    };
    await saveActive();
    try{GPS.start();}catch(error){active=null;await putRecord("settings",{key:ACTIVE_KEY,value:null});throw error;}
    setDrivingUI(true);
    announce("Drive recording. Data is being saved locally.");
    emit();
  }

  async function finish(){
    if(!active)return;
    const snapshot=active;
    try{GPS.stop();}catch(error){console.warn("GPS stop failed",error)}
    if(persistTimer){clearTimeout(persistTimer);persistTimer=null;}
    await saveActive();
    const ended=Date.now();
    const points=Array.isArray(snapshot.points)?snapshot.points.slice():[];
    const distance=Number(snapshot.distance||GPS.distance||0);
    const trip={
      vehicleId:snapshot.vehicleId,
      startTime:snapshot.startTime,
      endTime:iso(ended),
      distance,
      duration:Math.max(0,ended-snapshot.startMs),
      points,
      pointCount:points.length,
      status:"COMPLETED",
      recovered:!!snapshot.recovered,
      createdAt:iso(ended),
      synced:false,
      offlineRecorded:!navigator.onLine
    };
    await addRecord("trips",trip);
    active=null;
    await putRecord("settings",{key:ACTIVE_KEY,value:null});
    setDrivingUI(false);
    announce(`Trip saved locally: ${distance.toFixed(2)} kilometres.`);
    GPS.points=[];GPS.distance=0;
    window.DRIVE_LIVE_V038?.reset?.();
    emit();
    window.DRIVE_TRIPS_V37?.refresh?.();
    window.DRIVE_TRIPS_V039?.refresh?.();
    window.DRIVE_TRIP_INTELLIGENCE_V041?.refresh?.();
    window.DRIVE_BEHAVIOUR_V042?.refresh?.();
    window.DRIVE_V07?.refresh?.();
  }

  function onGPS(event){
    if(!active)return;
    const point=event.detail?.point;
    if(!point)return;
    active.points.push({...point});
    active.distance=Number(event.detail?.distance||GPS.distance||active.distance||0);
    active.lastPoint=point;
    active.lastCheckpoint=iso(Date.now());
    scheduleCheckpoint();
  }

  async function recover(){
    if(recovering||active)return;
    recovering=true;
    try{
      const record=typeof getRecord==="function"?await getRecord("settings",ACTIVE_KEY):null;
      const saved=record?.value;
      if(!saved||saved.status!=="ACTIVE")return;
      active={...saved,points:Array.isArray(saved.points)?saved.points:[],recovered:true};
      setDrivingUI(true);
      announce("Unfinished drive recovered. DRIVE is continuing to record locally.");
      try{
        GPS.start();
        GPS.points=active.points.slice();
        GPS.distance=Number(active.distance||0);
        GPS.lastPoint=active.lastPoint||GPS.points.at(-1)||null;
      }catch(error){console.warn("Recovered GPS could not restart",error);announce("Unfinished drive recovered. GPS needs to be restarted when available.");}
      emit();
    }catch(error){console.error("DRIVE trip recovery failed",error)}
    finally{recovering=false;}
  }

  function intercept(){
    document.addEventListener("click",event=>{
      const button=event.target.closest?.("button");
      if(!button)return;
      const isStart=button.id==="startDriveButton"||button.id==="tripStartButton";
      const isStop=button.id==="stopDriveButton";
      if(!isStart&&!isStop)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(isStart){start().catch(error=>{console.error("DRIVE start failed",error);announce(error?.message||"Could not start drive recording.")});}
      else{finish().catch(error=>{console.error("DRIVE trip finalization failed",error);announce("Trip could not be finalized yet. The local checkpoint is retained.")});}
    },true);
  }

  window.DRIVE_PERSISTENT_TRIP={start,finish,recover,isActive:()=>!!active,getActive:()=>active};
  document.addEventListener("gpsupdate",onGPS);
  window.addEventListener("pagehide",()=>{if(active)saveActive();});
  window.addEventListener("online",()=>{if(active)saveActive();});
  window.addEventListener("offline",()=>{if(active)saveActive();});
  const boot=()=>{intercept();if(typeof openDatabase==="function")openDatabase().then(recover).catch(error=>console.error("DRIVE persistence boot failed",error));};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
