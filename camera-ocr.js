/* DRIVE v0.11 — Camera + OCR foundation */
(() => {
    "use strict";

    const state = { stream: null, facingMode: "environment", mode: "fuel", capturedImage: null };
    const MODES = Object.freeze({ fuel: "Fuel receipt", odometer: "Odometer", service: "Service document", tyre: "Tyre sidewall" });
    const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

    function styles() {
        if (document.getElementById("cameraOcrStyles")) return;
        const s = document.createElement("style"); s.id = "cameraOcrStyles"; s.textContent = `
        .camera-ocr{margin-top:18px}.camera-panel{background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden}.camera-preview{position:relative;aspect-ratio:4/3;background:#050607;display:grid;place-items:center}.camera-preview video,.camera-preview img{width:100%;height:100%;object-fit:cover}.camera-placeholder{color:var(--muted);font-size:11px;padding:30px;text-align:center}.camera-controls{display:grid;gap:10px;padding:14px}.camera-mode{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.camera-mode button{min-height:40px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:9px;font-weight:800}.camera-mode button.active{color:var(--accent);border-color:var(--accent)}.camera-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.camera-actions button{min-height:48px}.camera-status{font-size:10px;color:var(--muted);line-height:1.5}.ocr-result{display:grid;gap:8px;margin-top:10px}.ocr-field{display:grid;gap:5px}.ocr-field label{font-size:9px;color:var(--muted);font-weight:800;letter-spacing:.06em}.ocr-field input{width:100%;box-sizing:border-box}.ocr-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}@media(max-width:560px){.camera-mode{grid-template-columns:repeat(2,1fr)}}
        `; document.head.appendChild(s);
    }

    function mount() {
        if (document.getElementById("cameraOcrPage")) return;
        const main = document.querySelector("main"); if (!main) return;
        main.insertAdjacentHTML("beforeend", `<section id="cameraOcrPage" class="page" aria-labelledby="camera-ocr-title"><div class="page-heading"><span class="eyebrow">CAPTURE</span><h1 id="camera-ocr-title">Camera</h1></div><div class="camera-ocr"><div class="camera-panel"><div id="cameraPreview" class="camera-preview"><div class="camera-placeholder">Camera is off.<br>Choose what you want DRIVE to read.</div></div><div class="camera-controls"><div id="cameraModes" class="camera-mode" role="group" aria-label="OCR capture type">${Object.entries(MODES).map(([key,label])=>`<button type="button" data-ocr-mode="${key}">${esc(label)}</button>`).join("")}</div><div class="camera-actions"><button type="button" class="large-action" id="cameraStart">START CAMERA</button><button type="button" class="large-action" id="cameraCapture" disabled>CAPTURE</button></div><div id="cameraStatus" class="camera-status" role="status" aria-live="polite">Local capture ready.</div><canvas id="cameraCanvas" hidden></canvas><div id="ocrResult" class="ocr-result hidden"></div></div></div></div></section>`);
        bind();
    }

    function bind() {
        document.querySelectorAll("[data-ocr-mode]").forEach(button => button.addEventListener("click", () => { state.mode = button.dataset.ocrMode; document.querySelectorAll("[data-ocr-mode]").forEach(b => b.classList.toggle("active", b === button)); setStatus(`${MODES[state.mode]} capture selected.`); }));
        document.getElementById("cameraStart")?.addEventListener("click", start);
        document.getElementById("cameraCapture")?.addEventListener("click", capture);
        document.querySelector("[data-ocr-mode=\"fuel\"]")?.click();
    }

    function setStatus(message) { const el = document.getElementById("cameraStatus"); if (el) el.textContent = message; }

    async function start() {
        if (!navigator.mediaDevices?.getUserMedia) { setStatus("Camera access is not supported by this browser."); return; }
        stop();
        try {
            state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: state.facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
            const preview = document.getElementById("cameraPreview"); preview.innerHTML = "";
            const video = document.createElement("video"); video.autoplay = true; video.playsInline = true; video.muted = true; video.setAttribute("aria-label", "Live camera preview"); preview.appendChild(video); video.srcObject = state.stream;
            document.getElementById("cameraCapture").disabled = false; document.getElementById("cameraStart").textContent = "RESTART CAMERA"; setStatus("Camera active. Frame the document or display clearly, then capture.");
        } catch (error) { console.error("DRIVE camera access failed", error); setStatus("Camera access was not available. Check browser permission and try again."); }
    }

    function stop() { state.stream?.getTracks().forEach(track => track.stop()); state.stream = null; }

    function capture() {
        const video = document.querySelector("#cameraPreview video"); const canvas = document.getElementById("cameraCanvas"); if (!video || !canvas || !video.videoWidth) return;
        canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext("2d", { willReadFrequently: true }).drawImage(video, 0, 0, canvas.width, canvas.height); state.capturedImage = canvas.toDataURL("image/jpeg", .88); stop(); document.getElementById("cameraCapture").disabled = true; document.getElementById("cameraStart").textContent = "RETAKE"; renderPreview(); prepareOcr();
    }

    function renderPreview() { const preview = document.getElementById("cameraPreview"); if (!preview || !state.capturedImage) return; preview.innerHTML = ""; const img = document.createElement("img"); img.src = state.capturedImage; img.alt = "Captured image for OCR review"; preview.appendChild(img); }

    async function prepareOcr() {
        setStatus("Capture complete. OCR engine will be loaded only when needed.");
        const result = document.getElementById("ocrResult"); if (!result) return;
        result.classList.remove("hidden"); result.innerHTML = `<div class="panel"><strong>REVIEW BEFORE SAVING</strong><p class="camera-status">OCR is ready for the <b>${esc(MODES[state.mode])}</b> workflow. Detected values will appear here for confirmation before anything is written to your vehicle records.</p><div class="ocr-actions"><button type="button" id="ocrRun" class="submit-button">RUN OCR</button><button type="button" id="ocrDiscard" class="large-action">DISCARD</button></div></div>`;
        document.getElementById("ocrRun")?.addEventListener("click", runOcr); document.getElementById("ocrDiscard")?.addEventListener("click", reset);
    }

    async function runOcr() {
        setStatus("OCR engine not bundled yet. Capture pipeline is working; local OCR integration is the next step.");
        const result = document.getElementById("ocrResult"); if (!result) return;
        result.querySelector(".panel")?.insertAdjacentHTML("beforeend", `<div class="camera-status">No data has been saved. This is intentional until OCR confidence and field parsing are available.</div>`);
    }

    function reset() { state.capturedImage = null; stop(); const preview = document.getElementById("cameraPreview"); if (preview) preview.innerHTML = `<div class="camera-placeholder">Camera is off.<br>Choose what you want DRIVE to read.</div>`; const result = document.getElementById("ocrResult"); result?.classList.add("hidden"); document.getElementById("cameraCapture")?.setAttribute("disabled", "true"); document.getElementById("cameraStart")?.removeAttribute("disabled"); document.getElementById("cameraStart").textContent = "START CAMERA"; setStatus("Local capture ready."); }

    function open() { mount(); document.querySelectorAll(".page").forEach(p => p.classList.remove("active")); document.getElementById("cameraOcrPage")?.classList.add("active"); document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active")); document.getElementById("cameraOcrPage")?.focus?.({ preventScroll: true }); }

    window.DRIVE_CAMERA = { open, start, capture, stop, reset };
    document.addEventListener("DOMContentLoaded", () => { styles(); mount(); });
})();
