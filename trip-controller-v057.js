/* DRIVE v0.66 — authoritative trip controller */
(function(){
  "use strict";
  const ACTIVE_KEY="activeDrive";
  let active=null,finishInProgress=false,bound=false;
  const $=id=>document.getElementById(id);
  const iso=ms=>new Date(ms).toISOString();
  const announce=message=>{const el=$("networkStatus")||$("recentActivity");if(el){el.dataset.message=message;el.setAttribute("aria-label",message);el.textContent=message;}};
  const emit=()=>window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"trips"}}));
  const state=()=>window.dispatchEvent(new CustomEvent("drive:tripstate",{detail:{state:active?"ACTIVE":"IDLE",active}}));
  const goToTrips=()=>{if(typeof window.DRIVE_APP?.showPage==="function")window.DRIVE_APP.showPage("tripsPage");};

  async function read(){try{return (await getRecord("settings",ACTIVE_KEY))?.value||null;}catch(e){console.error("DRIVE trip state read failed",e);return null;}}
  async function write(value){await putRecord("settings",{key:ACTIVE_KEY,value});}

  function ui(on){
    $("tripLiveCard")?.classList.toggle("hidden",!on);
    $("tripStartButton")?.classList.toggle("hidden",on);
    const stop=$("stopDriveButton");
    if(stop){stop.classList.toggle("hidden",!on);stop.disabled=false;stop.textContent="END DRIVE";stop.setAttribute("aria-hidden",on?"false":"true");}
    const b=$("startDriveButton");
    if(b)b.innerHTML=on?'<span class="action-icon" aria-hidden="true">●</span><span>DRIVING</span>':'<span class="action-icon" aria-hidden="true">●</span><span>START DRIVE</span>';
    state();
  }

  async function start(){
    if(active||finishInProgress)return;
    const saved=await read();
    if(saved?.status==="ACTIVE"){
      active={...saved,points:Array.isArray(saved.points)?saved.points:[],recovered:true};
      GPS.points=active.points.slice();GPS.distance=Number(active.distance||0);GPS.startTime=Number(active.startMs)||Date.now();
      try{GPS.start({preserveState:true});}catch(e){console.warn("DRIVE recovered GPS start failed",e);}
      ui(true);goToTrips();announce("Unfinished drive recovered.");return;
    }
    const vehicle=typeof getActiveVehicle==="function"?await getActiveVehicle():null;
    const now=Date.now();
    active={id:crypto.randomUUID?crypto.randomUUID():`drive-${now}`,vehicleId:vehicle?.id,startTime:iso(now),startMs:now,points:[],distance:0,status:"ACTIVE",recovered:false};
    await write(active);
    try{GPS.start();}catch(e){active=null;await write(null);throw e;}
    ui(true);goToTrips();announce("Drive recording. Data is saved locally.");emit();
  }

  async function finish(){
    if(finishInProgress)return;
    finishInProgress=true;
    const b=$("stopDriveButton");
    if(b){b.disabled=true;b.textContent="SAVING DRIVE…";}
    try{
      if(!active){const saved=await read();if(saved?.status==="ACTIVE")active={...saved,points:Array.isArray(saved.points)?saved.points:[],recovered:true};}
      if(!active){announce("No active drive found.");return;}
      const snapshot={...active,points:Array.isArray(active.points)?active.points.slice():[]};
      try{GPS.stop();}catch(e){console.warn("GPS stop failed",e);}
      const ended=Date.now(),distance=Number(snapshot.distance||GPS.distance||0);
      await addRecord("trips",{vehicleId:snapshot.vehicleId,startTime:snapshot.startTime,endTime:iso(ended),distance,duration:Math.max(0,ended-(Number(snapshot.startMs)||ended)),points:snapshot.points,pointCount:snapshot.points.length,status:"COMPLETED",recovered:!!snapshot.recovered,createdAt:iso(ended),synced:false,offlineRecorded:!navigator.onLine});
      await write(null);active=null;ui(false);
      try{GPS.points=[];GPS.distance=0;GPS.lastPoint=null;GPS.startTime=null;}catch(e){}
      window.DRIVE_LIVE_V038?.reset?.();emit();
      window.DRIVE_TRIPS_V37?.refresh?.();window.DRIVE_TRIPS_V039?.refresh?.();window.DRIVE_TRIP_INTELLIGENCE_V041?.refresh?.();window.DRIVE_BEHAVIOUR_V042?.refresh?.();window.DRIVE_V07?.refresh?.();
      announce(`Trip saved locally: ${distance.toFixed(2)} kilometres.`);
    }catch(error){
      console.error("DRIVE trip finalization failed",error);
      if(active){try{await write({...active,lastError:String(error?.message||error)});}catch(e){console.error("DRIVE trip checkpoint failed",e);}}
      ui(!!active);announce(`Drive could not be saved: ${error?.message||"local storage error"}`);
    }finally{if(b){b.disabled=false;b.textContent="END DRIVE";}finishInProgress=false;}
  }

  function onGPS(event){
    if(!active)return;
    const point=event.detail?.point;if(!point)return;
    active.points.push({...point});
    active.distance=Number(event.detail?.distance??GPS.distance??active.distance??0);
    active.lastPoint=point;
    write(active).catch(e=>console.warn("DRIVE trip checkpoint failed",e));
  }

  function bind(){
    if(bound)return;
    const startButton=$("startDriveButton"),stopButton=$("stopDriveButton");
    if(!startButton||!stopButton)return;
    bound=true;
    startButton.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();Promise.resolve(start()).catch(error=>{console.error("DRIVE start failed",error);active=null;ui(false);announce(`Drive could not start: ${error?.message||"error"}`);});},true);
    stopButton.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();Promise.resolve(finish()).catch(error=>console.error("DRIVE finish handler failed",error));},true);
  }

  async function boot(){
    bind();
    const saved=await read();
    if(saved?.status==="ACTIVE"){
      active={...saved,points:Array.isArray(saved.points)?saved.points:[],recovered:true};
      GPS.points=active.points.slice();GPS.distance=Number(active.distance||0);GPS.startTime=Number(active.startMs)||Date.now();
      ui(true);
      try{GPS.start({preserveState:true});}catch(e){console.warn("DRIVE recovery GPS start failed",e);}
      announce("Unfinished drive recovered.");
    }else ui(false);
  }

  document.addEventListener("gpsupdate",onGPS);
  document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,0),{once:true});
  window.DRIVE_TRIP_CONTROLLER={start,finish,recover:boot,isActive:()=>!!active,getActive:()=>active,version:"0.66"};
})();
