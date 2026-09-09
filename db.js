const DRIVE_DB = "drive-db";
const DRIVE_DB_VERSION = 3;

let dbInstance = null;
function createIndexIfMissing(store,name,keyPath,options={}){if(!store.indexNames.contains(name))store.createIndex(name,keyPath,options)}
function openDatabase(){if(dbInstance)return Promise.resolve(dbInstance);return new Promise((resolve,reject)=>{const request=indexedDB.open(DRIVE_DB,DRIVE_DB_VERSION);request.onupgradeneeded=event=>{const db=event.target.result,transaction=event.target.transaction;let vehicles;if(!db.objectStoreNames.contains("vehicles"))vehicles=db.createObjectStore("vehicles",{keyPath:"id",autoIncrement:true});else vehicles=transaction.objectStore("vehicles");createIndexIfMissing(vehicles,"isActive","isActive");let fuel;if(!db.objectStoreNames.contains("fuel"))fuel=db.createObjectStore("fuel",{keyPath:"id",autoIncrement:true});else fuel=transaction.objectStore("fuel");createIndexIfMissing(fuel,"odometer","odometer");createIndexIfMissing(fuel,"date","date");createIndexIfMissing(fuel,"vehicleId","vehicleId");let trips;if(!db.objectStoreNames.contains("trips"))trips=db.createObjectStore("trips",{keyPath:"id",autoIncrement:true});else trips=transaction.objectStore("trips");createIndexIfMissing(trips,"startTime","startTime");createIndexIfMissing(trips,"vehicleId","vehicleId");let maintenance;if(!db.objectStoreNames.contains("maintenance"))maintenance=db.createObjectStore("maintenance",{keyPath:"id",autoIncrement:true});else maintenance=transaction.objectStore("maintenance");createIndexIfMissing(maintenance,"date","date");createIndexIfMissing(maintenance,"vehicleId","vehicleId");let expenses;if(!db.objectStoreNames.contains("expenses"))expenses=db.createObjectStore("expenses",{keyPath:"id",autoIncrement:true});else expenses=transaction.objectStore("expenses");createIndexIfMissing(expenses,"date","date");createIndexIfMissing(expenses,"vehicleId","vehicleId");createIndexIfMissing(expenses,"category","category");if(!db.objectStoreNames.contains("settings"))db.createObjectStore("settings",{keyPath:"key"});let documents;if(!db.objectStoreNames.contains("documents"))documents=db.createObjectStore("documents",{keyPath:"id",autoIncrement:true});else documents=transaction.objectStore("documents");createIndexIfMissing(documents,"createdAt","createdAt");createIndexIfMissing(documents,"vehicleId","vehicleId")};request.onsuccess=()=>{dbInstance=request.result;dbInstance.onversionchange=()=>{dbInstance.close();dbInstance=null};resolve(dbInstance)};request.onerror=()=>reject(request.error||new Error("IndexedDB could not be opened"))})}
async function addRecord(storeName,data){const db=dbInstance||await openDatabase();return new Promise((resolve,reject)=>{let key;let settled=false;const transaction=db.transaction(storeName,"readwrite");const store=transaction.objectStore(storeName);const request=store.add(data);request.onsuccess=()=>{key=request.result};request.onerror=()=>{if(!settled){settled=true;reject(request.error||new Error(`Could not add record to ${storeName}`))}};transaction.oncomplete=()=>{if(!settled){settled=true;resolve(key)}};transaction.onerror=()=>{if(!settled){settled=true;reject(transaction.error||request.error||new Error(`Transaction failed for ${storeName}`))}};transaction.onabort=()=>{if(!settled){settled=true;reject(transaction.error||new Error(`Transaction aborted for ${storeName}`))}}})}
async function putRecord(storeName,data){const db=dbInstance||await openDatabase();return new Promise((resolve,reject)=>{let settled=false;const transaction=db.transaction(storeName,"readwrite");const request=transaction.objectStore(storeName).put(data);request.onsuccess=()=>{};request.onerror=()=>{if(!settled){settled=true;reject(request.error||new Error(`Could not update record in ${storeName}`))}};transaction.oncomplete=()=>{if(!settled){settled=true;resolve(data.id)}};transaction.onerror=()=>{if(!settled){settled=true;reject(transaction.error||request.error||new Error(`Transaction failed for ${storeName}`))}};transaction.onabort=()=>{if(!settled){settled=true;reject(transaction.error||new Error(`Transaction aborted for ${storeName}`))}}})}
async function getRecord(storeName,key){const db=dbInstance||await openDatabase();return new Promise((resolve,reject)=>{const request=db.transaction(storeName,"readonly").objectStore(storeName).get(key);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error)})}
async function deleteRecord(storeName,key){const db=dbInstance||await openDatabase();return new Promise((resolve,reject)=>{const request=db.transaction(storeName,"readwrite").objectStore(storeName).delete(key);request.onsuccess=()=>resolve(true);request.onerror=()=>reject(request.error)})}
async function getAllRecords(storeName){const db=dbInstance||await openDatabase();return new Promise((resolve,reject)=>{const request=db.transaction(storeName,"readonly").objectStore(storeName).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function getLatestRecord(storeName){const records=await getAllRecords(storeName);if(!records.length)return null;return records.sort((a,b)=>new Date(b.date||b.startTime||b.createdAt||0)-new Date(a.date||a.startTime||a.createdAt||0))[0]}
async function getActiveVehicle(){const vehicles=await getAllRecords("vehicles");return vehicles.find(vehicle=>vehicle.isActive)||null}
async function ensureDefaultVehicle(){const vehicles=await getAllRecords("vehicles"),active=vehicles.find(vehicle=>vehicle.isActive);if(active)return active;const existingLexus=vehicles.find(vehicle=>String(vehicle.make||"").toLowerCase()==="lexus"&&String(vehicle.model||"").toLowerCase()==="is250");if(existingLexus){existingLexus.isActive=true;await putRecord("vehicles",existingLexus);return existingLexus}const vehicle={name:"Lexus IS250",make:"Lexus",model:"IS250",year:2007,engine:"2.5L V6",odometer:128421,isActive:true,createdAt:new Date().toISOString()};vehicle.id=await addRecord("vehicles",vehicle);return vehicle}
async function setActiveVehicle(vehicleId){const vehicles=await getAllRecords("vehicles");for(const vehicle of vehicles){const shouldBeActive=vehicle.id===vehicleId;if(vehicle.isActive!==shouldBeActive){vehicle.isActive=shouldBeActive;await putRecord("vehicles",vehicle)}}return getRecord("vehicles",vehicleId)}

/* DRIVE v0.43 — direct-boot UI polish. Kept here deliberately so the UI still works
   even if a later optional module fails during the app's sequential module load. */
(()=>{
  "use strict";
  const svg=(paths)=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
  const icons={
    home:'<path d="M3.5 10.8 12 3.9l8.5 6.9v8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z"/><path d="M9 20.5v-5.7h6v5.7"/>',
    route:'<path d="M6 19c2.4 0 3.8-1.2 3.8-3.2 0-3.1-3.5-4-3.5-7.1A4 4 0 0 1 10.4 5"/><path d="M14 5c2.2 0 3.5 1.4 3.5 3.4 0 3.1-3.4 4.1-3.4 7 0 2 1.4 3.1 3.9 3.1"/><circle cx="6" cy="19" r="1.3"/><circle cx="18" cy="19" r="1.3"/>',
    fuel:'<path d="M6 20V5.5A1.5 1.5 0 0 1 7.5 4H14a1.5 1.5 0 0 1 1.5 1.5V20M4.5 20h12"/><path d="M8.5 7h4.5v4H8.5zM15.5 8.2h1.2a2 2 0 0 1 2 2v5.3a1.5 1.5 0 0 0 3 0V12"/>',
    car:'<path d="m5 16.8 1.7-7A2.4 2.4 0 0 1 9 8h6a2.4 2.4 0 0 1 2.3 1.8l1.7 7"/><path d="M4 13h16M5 17v2M19 17v2"/><circle cx="7.5" cy="16.5" r="1"/><circle cx="16.5" cy="16.5" r="1"/>',
    more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    play:'<path d="m9 6 9 6-9 6z" fill="currentColor" stroke="none"/>',
    wrench:'<path d="M15 5.2a5 5 0 0 0-5.8 6L4.4 16a2 2 0 1 0 2.8 2.8l5.7-5.7a5 5 0 0 0 6-5.8l-3.1 3.1-2.4-2.4z"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a7.8 7.8 0 0 0 0-6l1.1-.9-1.8-3-1.4.5a7.7 7.7 0 0 0-5.2-3L12 1h-3.5l-.2 1.6a7.7 7.7 0 0 0-5.2 3l-1.4-.5-1.8 3L1 9a7.8 7.8 0 0 0 0 6l-1.1.9 1.8 3 1.4-.5a7.7 7.7 0 0 0 5.2 3l.2 1.6H12l.2-1.6a7.7 7.7 0 0 0 5.2-3l1.4.5 1.8-3z" transform="translate(1 0) scale(.92)"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    edit:'<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m13.5 7.5 3 3"/>'
  };
  function injectStyles(){
    if(document.getElementById("drive-v043-ui-style"))return;
    const style=document.createElement("style");style.id="drive-v043-ui-style";style.textContent=`
      .drive-v043-icon{width:20px;height:20px;display:inline-grid;place-items:center;flex:0 0 20px}
      .drive-v043-icon svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
      .nav-item .drive-v043-icon{width:21px;height:21px}
      .action-icon .drive-v043-icon{width:19px;height:19px}
      .drive-odo-edit{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;margin-left:10px;border:1px solid var(--line);border-radius:50%;background:var(--surface);color:var(--muted);vertical-align:middle;cursor:pointer;transition:.15s ease}
      .drive-odo-edit:active{transform:scale(.94);background:var(--surface-2)}
      .drive-odo-edit svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
      .drive-odo-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .drive-odo-edit-label{font-size:9px;letter-spacing:.1em;color:var(--muted);font-weight:800}
      #driveOdometerModal .modal-sheet{padding-top:18px}
    `;document.head.appendChild(style);
  }
  function replaceIcons(){
    const map=[['.nav-item[data-page="dashboardPage"] span','home'],['.nav-item[data-page="tripsPage"] span','route'],['.nav-item[data-page="fuelPage"] span','fuel'],['.nav-item[data-page="carPage"] span','car'],['.nav-item[data-page="morePage"] span','more'],['[data-action="fuel"] .action-icon','fuel'],['[data-action="service"] .action-icon','wrench'],['#startDriveButton .action-icon','play'],['#settingsButton','settings']];
    map.forEach(([selector,name])=>document.querySelectorAll(selector).forEach(el=>{if(el.dataset.v043Icon)return;el.dataset.v043Icon=name;el.innerHTML=`<span class="drive-v043-icon">${svg(icons[name])}</span>`}));
    document.querySelectorAll("#morePage .settings-list button").forEach(btn=>{if(btn.dataset.v043Icon)return;const t=btn.textContent.trim().toLowerCase();let name=t.startsWith("maintenance")?'wrench':t.startsWith("analytics")?'chart':t.startsWith("data")?'document':t.startsWith("settings")?'settings':t.startsWith("camera")?'camera':'chevron';if(!icons[name])return;btn.dataset.v043Icon=name;const arrow=btn.querySelector("span[aria-hidden]");if(arrow){arrow.innerHTML=`${svg(icons[name])}`;arrow.className="drive-v043-icon"}});
  }
  async function getVehicle(){let v=await getActiveVehicle();if(!v&&typeof ensureDefaultVehicle==="function")v=await ensureDefaultVehicle();return v}
  function addOdometerControl(){
    const odo=document.getElementById("odometerValue");if(!odo||document.getElementById("driveOdoEdit"))return;
    const button=document.createElement("button");button.id="driveOdoEdit";button.type="button";button.className="drive-odo-edit";button.setAttribute("aria-label","Edit odometer");button.innerHTML=svg(icons.edit);button.addEventListener("click",openOdometer);
    odo.insertAdjacentElement("afterend",button);
    const label=document.createElement("span");label.className="drive-odo-edit-label";label.textContent="EDIT";button.insertAdjacentElement("afterend",label);
  }
  function ensureOdoModal(){
    let m=document.getElementById("driveOdometerModal");if(m)return m;
    m=document.createElement("div");m.id="driveOdometerModal";m.className="modal hidden";m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.innerHTML=`<div class="modal-sheet"><div class="modal-handle" aria-hidden="true"></div><div class="modal-header"><div><span class="eyebrow">VEHICLE DATA</span><h2>Odometer</h2></div><button type="button" class="modal-close" id="driveOdoClose" aria-label="Close odometer">×</button></div><form id="driveOdoForm"><label for="driveOdoInput">Current odometer<div class="input-unit"><input id="driveOdoInput" type="number" min="0" max="99999999" step="1" inputmode="numeric" required><span>KM</span></div></label><p id="driveOdoError" class="form-error" role="alert" hidden></p><button type="submit" class="submit-button">SAVE ODOMETER</button></form></div>`;document.body.appendChild(m);
    m.querySelector("#driveOdoClose").addEventListener("click",()=>m.classList.add("hidden"));m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden")});m.querySelector("#driveOdoForm").addEventListener("submit",saveOdometer);return m;
  }
  async function openOdometer(){const m=ensureOdoModal(),v=await getVehicle();if(!v)return;const input=m.querySelector("#driveOdoInput");input.value=v.odometer??document.getElementById("odometerValue")?.textContent.replace(/,/g,"")||"";m.querySelector("#driveOdoError").hidden=true;m.classList.remove("hidden");setTimeout(()=>input.focus(),30)}
  async function saveOdometer(e){e.preventDefault();const m=e.currentTarget.closest(".modal"),input=m.querySelector("#driveOdoInput"),err=m.querySelector("#driveOdoError"),value=Number(input.value);if(!Number.isInteger(value)||value<0||value>99999999){err.textContent="Enter a valid odometer reading.";err.hidden=false;return}try{const v=await getVehicle();if(!v)throw new Error("No active vehicle");v.odometer=value;v.updatedAt=new Date().toISOString();await putRecord("vehicles",v);const display=document.getElementById("odometerValue");if(display)display.textContent=value.toLocaleString("en-US");document.querySelectorAll(".vehicle-details strong").forEach(el=>{if(el.parentElement?.querySelector("span")?.textContent.trim().toUpperCase()==="ODOMETER")el.textContent=`${value.toLocaleString("en-US")} km`});m.classList.add("hidden");window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"vehicles",id:v.id}}));if(typeof initV06==="function")await initV06();}catch(error){console.error("DRIVE odometer save failed",error);err.textContent="Odometer could not be saved. Please try again.";err.hidden=false}}
  function boot(){injectStyles();replaceIcons();addOdometerControl();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.DRIVE_ODOMETER={open:openOdometer};
})();
