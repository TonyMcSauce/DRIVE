/* DRIVE v0.46 — Components / Parts Memory */
(()=>{
  "use strict";
  const DB_NAME="drive-db";
  const DB_VERSION=4;
  let dbPromise=null;
  const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const activeVehicle=async()=>typeof getActiveVehicle==="function"?getActiveVehicle():null;
  function openComponentsDB(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=event=>{
        const db=event.target.result,tx=event.target.transaction;
        let store;
        if(!db.objectStoreNames.contains("components"))store=db.createObjectStore("components",{keyPath:"id",autoIncrement:true});
        else store=tx.objectStore("components");
        const addIndex=(name,keyPath,options={})=>{if(!store.indexNames.contains(name))store.createIndex(name,keyPath,options)};
        addIndex("vehicleId","vehicleId");
        addIndex("category","category");
        addIndex("name","name");
        addIndex("updatedAt","updatedAt");
      };
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db)};
      request.onerror=()=>reject(request.error||new Error("Components database could not be opened"));
      request.onblocked=()=>console.warn("DRIVE components database upgrade is waiting for another tab to close");
    });
    return dbPromise;
  }
  async function all(){const db=await openComponentsDB();return new Promise((resolve,reject)=>{const r=db.transaction("components","readonly").objectStore("components").getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
  async function save(record){const db=await openComponentsDB();return new Promise((resolve,reject)=>{const r=db.transaction("components","readwrite").objectStore("components").put(record);r.onsuccess=()=>resolve(record.id);r.onerror=()=>reject(r.error)})}
  async function remove(id){const db=await openComponentsDB();return new Promise((resolve,reject)=>{const r=db.transaction("components","readwrite").objectStore("components").delete(id);r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error)})}
  function styles(){
    if(document.getElementById("driveV046ComponentStyles"))return;
    const s=document.createElement("style");s.id="driveV046ComponentStyles";s.textContent=`
      .v046-components{margin-top:18px}.v046-component-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.v046-component-heading>div span{display:block;color:var(--muted,#858c93);font-size:8px;font-weight:900;letter-spacing:.1em}.v046-component-heading>div strong{display:block;margin-top:4px;font-size:15px}.v046-add{min-height:34px;padding:0 11px;border:1px solid var(--line,#303030);border-radius:10px;background:var(--surface,#151515);color:var(--muted,#a0a0a0);font-size:8px;font-weight:900;letter-spacing:.08em;cursor:pointer}.v046-component-list{display:grid;gap:7px}.v046-component{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px;border:1px solid var(--line,#303030);border-radius:13px;background:var(--surface,#151515)}.v046-component-main{min-width:0}.v046-component-main strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v046-component-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.v046-chip{display:inline-flex;padding:3px 6px;border:1px solid rgba(255,255,255,.08);border-radius:6px;color:var(--muted,#858c93);font-size:8px;font-weight:800;letter-spacing:.04em}.v046-component-note{margin-top:5px;color:var(--muted,#858c93);font-size:9px;line-height:1.4}.v046-component-actions{display:flex;gap:5px}.v046-mini{width:30px;height:30px;border:1px solid var(--line,#303030);border-radius:9px;background:transparent;color:var(--muted,#858c93);cursor:pointer;font-size:9px;font-weight:900}.v046-empty{padding:14px;border:1px dashed var(--line,#303030);border-radius:13px}.v046-empty strong{display:block;font-size:11px}.v046-empty span{display:block;margin-top:4px;color:var(--muted,#858c93);font-size:10px;line-height:1.4}.v046-modal{position:fixed;inset:0;z-index:1000;display:grid;place-items:end center;background:rgba(0,0,0,.62);padding:0}.v046-modal.hidden{display:none}.v046-sheet{width:min(100%,560px);max-height:92vh;overflow:auto;padding:18px 18px 24px;background:var(--background,#0d0f10);border:1px solid var(--line,#303030);border-bottom:0;border-radius:18px 18px 0 0}.v046-modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.v046-modal-header span{display:block;color:var(--muted,#858c93);font-size:8px;font-weight:900;letter-spacing:.1em}.v046-modal-header h2{margin:5px 0 0;font-size:20px}.v046-close{width:32px;height:32px;border:1px solid var(--line,#303030);border-radius:50%;background:transparent;color:var(--muted,#858c93);font-size:18px;cursor:pointer}.v046-form{display:grid;gap:12px}.v046-form label{display:grid;gap:6px;color:var(--muted,#a0a0a0);font-size:9px;font-weight:800;letter-spacing:.05em}.v046-form input,.v046-form select,.v046-form textarea{width:100%;box-sizing:border-box;border:1px solid var(--line,#303030);border-radius:10px;background:var(--surface,#151515);color:inherit;padding:11px;font:inherit;font-size:12px;letter-spacing:0}.v046-form textarea{min-height:74px;resize:vertical}.v046-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.v046-save{min-height:44px;border:0;border-radius:11px;background:var(--accent,#d8ff3e);color:#101210;font-size:9px;font-weight:950;letter-spacing:.08em;cursor:pointer}@media(max-width:480px){.v046-component{grid-template-columns:1fr}.v046-component-actions{justify-content:flex-end}.v046-form-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function ensureModal(){
    let modal=document.getElementById("componentModal");
    if(modal)return modal;
    modal=document.createElement("div");modal.id="componentModal";modal.className="v046-modal hidden";modal.innerHTML=`<div class="v046-sheet" role="dialog" aria-modal="true" aria-labelledby="componentModalTitle"><div class="v046-modal-header"><div><span>VEHICLE COMPONENT</span><h2 id="componentModalTitle">Add Component</h2></div><button type="button" class="v046-close" id="componentModalClose" aria-label="Close">×</button></div><form class="v046-form" id="componentForm"><input type="hidden" id="componentId"><label>Name<input id="componentName" maxlength="80" required placeholder="e.g. Front Brake System"></label><div class="v046-form-grid"><label>Category<select id="componentCategory"><option>Engine</option><option>Transmission</option><option>Brakes</option><option>Suspension</option><option>Steering</option><option>Electrical</option><option>Cooling</option><option>Fuel System</option><option>Exhaust</option><option>Body</option><option>Tyres & Wheels</option><option>Other</option></select></label><label>Status<select id="componentStatus"><option>Active</option><option>Needs Attention</option><option>Replaced</option><option>Removed</option></select></label></div><div class="v046-form-grid"><label>Part number<input id="componentPartNumber" maxlength="60" placeholder="Optional"></label><label>Installed odometer<input id="componentInstalledOdometer" type="number" min="0" step="1" inputmode="numeric" placeholder="Optional"></label></div><div class="v046-form-grid"><label>Installation date<input id="componentInstalledDate" type="date"></label><label>Cost<input id="componentCost" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Optional"></label></div><label>Supplier / Workshop<input id="componentSupplier" maxlength="100" placeholder="Optional"></label><label>Notes<textarea id="componentNotes" maxlength="500" placeholder="What should DRIVE remember?"></textarea></label><button type="submit" class="v046-save">SAVE COMPONENT</button></form></div>`;document.body.appendChild(modal);
    document.getElementById("componentModalClose").addEventListener("click",closeModal);modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});document.getElementById("componentForm").addEventListener("submit",submitForm);return modal;
  }
  function closeModal(){document.getElementById("componentModal")?.classList.add("hidden")}
  function openModal(record=null){ensureModal();const fields={id:"",name:"",category:"Engine",status:"Active",partNumber:"",installedOdometer:"",installedDate:"",cost:"",supplier:"",notes:""};Object.assign(fields,record||{});document.getElementById("componentModalTitle").textContent=record?"Edit Component":"Add Component";Object.entries(fields).forEach(([key,value])=>{const el=document.getElementById("component"+key.charAt(0).toUpperCase()+key.slice(1));if(el)el.value=value??""});document.getElementById("componentModal")?.classList.remove("hidden");document.getElementById("componentName")?.focus()}
  async function submitForm(event){
    event.preventDefault();
    const vehicle=await activeVehicle();if(!vehicle)return;
    const id=Number(document.getElementById("componentId").value)||null;
    const old=id?(await all()).find(x=>x.id===id):null;
    const record={id:old?.id,vehicleId:vehicle.id,name:document.getElementById("componentName").value.trim(),category:document.getElementById("componentCategory").value,status:document.getElementById("componentStatus").value,partNumber:document.getElementById("componentPartNumber").value.trim(),installedOdometer:Number(document.getElementById("componentInstalledOdometer").value)||null,installedDate:document.getElementById("componentInstalledDate").value||null,cost:Number(document.getElementById("componentCost").value)||0,supplier:document.getElementById("componentSupplier").value.trim(),notes:document.getElementById("componentNotes").value.trim(),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(!record.name)return;
    await save(record);closeModal();await render();window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"components"}}));
  }
  function formatDate(v){if(!v)return"";const d=new Date(v+(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)?"T00:00:00":""));return Number.isNaN(d.getTime())?"":d.toLocaleDateString()}
  async function render(){
    styles();
    const root=document.getElementById("vehicleMemory");if(!root)return;
    const vehicle=await activeVehicle();if(!vehicle)return;
    const records=(await all()).filter(r=>r.vehicleId==null||r.vehicleId===vehicle.id).sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0));
    let section=document.getElementById("vehicleComponentsSection");if(section)section.remove();
    section=document.createElement("section");section.id="vehicleComponentsSection";section.className="v046-components";section.innerHTML=`<div class="v046-component-heading"><div><span>COMPONENT MEMORY</span><strong>${records.length} recorded component${records.length===1?"":"s"}</strong></div><button type="button" class="v046-add" id="addComponentButton">+ ADD</button></div><div class="v046-component-list">${records.length?records.map(r=>`<article class="v046-component" data-component-id="${r.id}"><div class="v046-component-main"><strong>${esc(r.name)}</strong><div class="v046-meta"><span class="v046-chip">${esc(r.category)}</span><span class="v046-chip">${esc(r.status)}</span>${r.installedOdometer?`<span class="v046-chip">${Number(r.installedOdometer).toLocaleString()} km</span>`:""}${r.cost?`<span class="v046-chip">P${Number(r.cost).toFixed(2)}</span>`:""}</div>${r.partNumber?`<div class="v046-component-note">Part ${esc(r.partNumber)}</div>`:""}${r.installedDate?`<div class="v046-component-note">Installed ${esc(formatDate(r.installedDate))}${r.supplier?` · ${esc(r.supplier)}`:""}</div>`:r.supplier?`<div class="v046-component-note">${esc(r.supplier)}</div>`:""}${r.notes?`<div class="v046-component-note">${esc(r.notes)}</div>`:""}</div><div class="v046-component-actions"><button type="button" class="v046-mini" data-component-edit="${r.id}" aria-label="Edit ${esc(r.name)}">EDIT</button><button type="button" class="v046-mini" data-component-delete="${r.id}" aria-label="Delete ${esc(r.name)}">×</button></div></article>`).join(""): `<div class="v046-empty"><strong>No components recorded yet.</strong><span>Add parts or systems as you work on the vehicle. DRIVE will use these records as the foundation for component history and maintenance intelligence.</span></div>`}</div>`;
    root.appendChild(section);
    section.querySelector("#addComponentButton")?.addEventListener("click",()=>openModal());
    section.querySelectorAll("[data-component-edit]").forEach(b=>b.addEventListener("click",async()=>{const r=(await all()).find(x=>x.id===Number(b.dataset.componentEdit));if(r)openModal(r)}));
    section.querySelectorAll("[data-component-delete]").forEach(b=>b.addEventListener("click",async()=>{const r=(await all()).find(x=>x.id===Number(b.dataset.componentDelete));if(!r)return;if(!window.confirm(`Delete ${r.name}?`))return;await remove(r.id);await render();window.dispatchEvent(new CustomEvent("drive:datachanged",{detail:{store:"components"}}))}));
  }
  async function init(){try{await openComponentsDB();styles();ensureModal();setTimeout(render,80)}catch(error){console.error("DRIVE Components failed",error)}}
  window.DRIVE_COMPONENTS={refresh:render,open:add=>openModal(add||null)};
  window.addEventListener("drive:datachanged",()=>{setTimeout(render,0)});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
