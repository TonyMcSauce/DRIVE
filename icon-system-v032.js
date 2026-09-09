/* DRIVE v0.32 — V0.5-inspired icon language
   Reuses the original inline SVG symbol vocabulary and adds a small set of
   matching symbols for newer intelligence features. No external icon library. */
(function(){
  'use strict';
  const SYMBOLS = `
  <symbol id="icon-home" viewBox="0 0 24 24"><path d="M3.5 10.7 12 3.8l8.5 6.9v8.1a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7v-8.1Z"/><path d="M9 20.5v-5.8h6v5.8"/></symbol>
  <symbol id="icon-route" viewBox="0 0 24 24"><path d="M5 19.2c2.2 0 3.7-1.1 3.7-3.1 0-3.3-3.4-4.1-3.4-7.1 0-2.4 1.7-4.2 4.2-4.2"/><path d="M15.2 4.8c2.3 0 3.5 1.5 3.5 3.4 0 3.2-3.6 4.1-3.6 7 0 1.8 1.3 3 3.8 3"/><circle cx="5" cy="19.2" r="1.5"/><circle cx="18.9" cy="19.2" r="1.5"/></symbol>
  <symbol id="icon-fuel" viewBox="0 0 24 24"><path d="M5.5 20V5.5A1.5 1.5 0 0 1 7 4h7.2a1.5 1.5 0 0 1 1.5 1.5V20"/><path d="M5 20h11"/><path d="M8 7h5v4H8z"/><path d="M15.7 8.2h1.4c1 0 1.8.8 1.8 1.8v5.2c0 1.1.8 1.9 1.7 1.9"/><path d="M19.8 17.1v-2.7"/></symbol>
  <symbol id="icon-car" viewBox="0 0 24 24"><path d="M4.2 16.8v-4.1l2-5A2.2 2.2 0 0 1 8.3 6h7.4a2.2 2.2 0 0 1 2.1 1.7l2 5v4.1"/><path d="M4.2 12.7h15.6"/><path d="M7.2 16.8h.1M16.7 16.8h.1"/><path d="M4.2 16.8v1.7M19.8 16.8v1.7"/></symbol>
  <symbol id="icon-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></symbol>
  <symbol id="icon-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="icon-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" stroke="none"/></symbol>
  <symbol id="icon-stop" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none"/></symbol>
  <symbol id="icon-location" viewBox="0 0 24 24"><path d="M19 10.2c0 5.1-7 10.1-7 10.1S5 15.3 5 10.2a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></symbol>
  <symbol id="icon-wrench" viewBox="0 0 24 24"><path d="M14.7 5.1a5 5 0 0 0-6.1 6.1L4.2 15.6a2.1 2.1 0 0 0 3 3l4.4-4.4a5 5 0 0 0 6.1-6.1l-3 3-2.2-2.2 3-3Z"/></symbol>
  <symbol id="icon-camera" viewBox="0 0 24 24"><rect x="3.5" y="6.5" width="17" height="13" rx="2.5"/><path d="M8 6.5 9.3 4h5.4L16 6.5"/><circle cx="12" cy="13" r="3"/></symbol>
  <symbol id="icon-chevron" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></symbol>
  <symbol id="icon-check" viewBox="0 0 24 24"><path d="m5 12 4.2 4.2L19 6.5"/></symbol>
  <symbol id="icon-gas" viewBox="0 0 24 24"><path d="M6 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h12M8 7h5v4H8M15 8h1.5a2 2 0 0 1 2 2v6.5a1.5 1.5 0 0 0 3 0V12"/></symbol>
  <symbol id="icon-speed" viewBox="0 0 24 24"><path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 12 4-4M7 18h10"/></symbol>
  <symbol id="icon-chart" viewBox="0 0 24 24"><path d="M4 19V5M4 19h16"/><path d="m7 15 3-4 3 2 5-7"/></symbol>
  <symbol id="icon-wallet" viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"/><path d="M4 8h13.5A2.5 2.5 0 0 1 20 10.5V13h-4a2 2 0 0 1 0-4h4"/></symbol>
  <symbol id="icon-trend" viewBox="0 0 24 24"><path d="M4 17 9 12l3 3 7-8"/><path d="M14 7h5v5"/></symbol>
  <symbol id="icon-brain" viewBox="0 0 24 24"><path d="M9.2 5.2A3.2 3.2 0 0 1 12 7a3.2 3.2 0 0 1 2.8-1.8A3.2 3.2 0 0 1 18 8.4a3.1 3.1 0 0 1 1 5.8 3.2 3.2 0 0 1-3 4.6 3.2 3.2 0 0 1-4-1.1 3.2 3.2 0 0 1-4 1.1 3.2 3.2 0 0 1-3-4.6 3.1 3.1 0 0 1 1-5.8 3.2 3.2 0 0 1 3.2-3.2Z"/><path d="M12 7v11M8.2 10.2h2M13.8 10.2h2M8.5 14h2M13.5 14h2"/></symbol>
  <symbol id="icon-document" viewBox="0 0 24 24"><path d="M7 3.8h7l4 4v12.4H7z"/><path d="M14 3.8v4h4M10 12h5M10 15h5"/></symbol>
  <symbol id="icon-settings" viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19 13.2 1.1.9-1.7 2.9-1.3-.5a7.7 7.7 0 0 1-1.8 1l-.2 1.4h-3.4l-.2-1.4a7.7 7.7 0 0 1-1.8-1l-1.3.5-1.7-2.9 1.1-.9a7.3 7.3 0 0 1 0-2.4l-1.1-.9 1.7-2.9 1.3.5a7.7 7.7 0 0 1 1.8-1l.2-1.4h3.4l.2 1.4a7.7 7.7 0 0 1 1.8 1l1.3-.5 1.7 2.9-1.1.9a7.3 7.3 0 0 1 0 2.4Z"/></symbol>
  `;
  function install(){
    if(document.getElementById('drive-icon-defs-v032')) return;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.id='drive-icon-defs-v032'; svg.setAttribute('aria-hidden','true'); svg.setAttribute('width','0'); svg.setAttribute('height','0');
    svg.style.cssText='position:absolute;overflow:hidden;pointer-events:none';
    const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
    defs.innerHTML=SYMBOLS; svg.appendChild(defs); document.body.prepend(svg);
  }
  function refresh(){
    document.querySelectorAll('[data-drive-icon]').forEach(el=>{
      if(el.querySelector('svg')) return;
      const name=el.getAttribute('data-drive-icon');
      el.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-'+name+'"></use></svg>';
    });
  }
  window.DRIVE_ICONS={install,refresh};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{install();refresh()},{once:true}); else {install();refresh();}
})();
