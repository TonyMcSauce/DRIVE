/* DRIVE — Vehicle Settings */
(()=>{
"use strict";
let modal=null;
const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function ensureModal(){
  const required=["vehicleNameInput","vehicleMakeInput","vehicleModelInput","vehicleYearInput","vehicleEngineInput","vehicleOdometerInput","vehicleSettingsError"];
  let existing=document.getElementById("vehicleSettingsModal");
  const valid=existing&&required.every(id=>existing.querySelector(`#${id}`));
  if(valid){modal=existing;bindModal();return modal}
  if(existing)existing.remove();
  modal=document.createElement("div");
  modal.id="vehicleSettingsModal";
  modal.className="modal hidden";
  modal.innerHTML=`<div class="modal-sheet"><div class="modal-header"><div><span class="eyebrow">VEHICLE PROFILE</span><h2>Settings</h2></div><button type="button" class="modal-close" data-settings-close aria-label="Close vehicle settings">×</button></div><form id="vehicleSettingsForm" novalidate><label>Vehicle name<input id="vehicleNameInput" maxlength="60" required></label><label>Make<input id="vehicleMakeInput" maxlength="40" required></label><label>Model<input id="vehicleModelInput" maxlength="40" required></label><label>Year<input id="vehicleYearInput" type="number" min="1886" max="2100" step="1" required></label><label>Engine<input id="vehicleEngineInput" maxlength="40"></label><label>Current odometer<div class="input-unit"><input id="vehicleOdometerInput" type="number" min="0" max="99999999" step="1" required><span>KM</span></div></label><p id="vehicleSettingsError" class="form-error" role="alert" hidden></p><button type="submit" class="submit-button">SAVE VEHICLE</button></form></div>`;
  document.body.appendChild(modal);
  bindModal();
  return modal;
}
function bindModal(){if(!modal)return;const close=modal.querySelector("[data-settings-close]");if(close&&!close.dataset.bound){close.dataset.bound="1";close.onclick=closeSettings}const form=modal.querySelector("#vehicleSettingsForm");if(form&&!form.dataset.bound){form.dataset.bound="1";form.addEventListener("submit",save)}}
async function getVehicle(){let v=await getActiveVehicle();if(!v&&typeof ensureDefaultVehicle==="function")v=await ensureDefaultVehicle();return v}
async function open(){try{const v=await getVehicle();if(!v){alert("DRIVE could not load the active vehicle.");return}const m=ensureModal(),q=id=>m.querySelector(`#${id}`);q("vehicleNameInput").value=v.name||"";q("vehicleMakeInput").value=v.make||"";q("vehicleModelInput").value=v.model||"";q("vehicleYearInput").value=v.year||"";q("vehicleEngineInput").value=v.engine||"";q("vehicleOdometerInput").value=v.odometer??"";q("vehicleSettingsError").hidden=true;m.classList.remove("hidden");q("vehicleNameInput").focus()}catch(e){console.error("Vehicle settings open failed",e)}}
function closeSettings(){modal?.classList.add("hidden")}
async function save(e){e.preventDefault();const m=ensureModal(),q=id=>m.querySelector(`#${id}`),err=q("vehicleSettingsError"),v=await getVehicle();if(!v){err.textContent="Vehicle data is unavailable. Reload DRIVE.";err.hidden=false;return}const name=q("vehicleNameInput").value.trim(),make=q("vehicleMakeInput").value.trim(),model=q("vehicleModelInput").value.trim(),year=Number(q("vehicleYearInput").value),engine=q("vehicleEngineInput").value.trim(),odometer=Number(q("vehicleOdometerInput").value);if(!name||!make||!model||!Number.isInteger(year)||year<1886||year>2100||!Number.isFinite(odometer)||odometer<0||odometer>99999999){err.textContent="Check the vehicle details and odometer value.";err.hidden=false;return}try{const btn=m.querySelector("button[type=submit");btn.disabled=true;Object.assign(v,{name,make,model,year,engine,odometer,updatedAt:new Date().toISOString()});await putRecord("vehicles",v);m.classList.add("hidden");window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"vehicles",id:v.id}}));if(typeof initV06==="function")await initV06();notifyDone(`Vehicle saved: ${name}.`)}catch(error){console.error("Vehicle settings save failed",error);err.textContent="Vehicle could not be saved. Please try again.";err.hidden=false}finally{const btn=m.querySelector("button[type=submit]");if(btn)btn.disabled=false}}
function notifyDone(msg){if(typeof announce==="function")announce(msg);else console.info(msg)}
function bindTriggers(){const handler=e=>{const b=e.target.closest?.("#settingsButton, #morePage .settings-list button");if(!b)return;if(b.id==="settingsButton"||b.textContent.trim().toLowerCase().startsWith("settings")){e.preventDefault();open()}};if(!document.documentElement.dataset.vehicleSettingsDelegated){document.documentElement.dataset.vehicleSettingsDelegated="1";document.addEventListener("click",handler)}}
window.DRIVE_VEHICLE_SETTINGS={open,close:closeSettings};
function boot(){bindTriggers();if(document.getElementById("vehicleSettingsModal"))ensureModal()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
