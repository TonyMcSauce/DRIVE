/* DRIVE v0.66 — trip persistence compatibility shim
   The authoritative controller now lives in trip-controller-v057.js.
   This file intentionally contains no second trip state machine.
*/
(function(){
  "use strict";
  function controller(){return window.DRIVE_TRIP_CONTROLLER||null;}
  window.DRIVE_PERSISTENT_TRIP={
    start:()=>controller()?.start?.(),
    finish:()=>controller()?.finish?.(),
    recover:()=>controller()?.recover?.(),
    isActive:()=>!!controller()?.isActive?.(),
    getActive:()=>controller()?.getActive?.()
  };
})();
