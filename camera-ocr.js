/* DRIVE v0.11 — Camera + OCR workflows */
(() => {
    "use strict";

    const state = { stream: null, facingMode: "environment", mode: "fuel", capturedImage: null, ocrText: "", confidence: null };
    const MODES = Object.freeze({ fuel: "Fuel receipt", odometer: "Odometer", service: "Service document", tyre: "Tyre sidewall" });
    const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const num = value => Number(String(value ?? "").replace(/,/g, ".").replace(/[^0-9.]/g, ""));
    const dateValue = value => { const m = String(value || "").match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/); if (!m) return ""; const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`; };

    function styles() {
        if (document.getElementById("cameraOcrStyles")) return;
        const s = document.createElement("style"); s.id = "cameraOcrStyles"; s.textContent = `
        .camera-ocr{margin-top:18px}.camera-panel{background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden}.camera-preview{position:relative;aspect-ratio:4/3;background:#050607;display:grid;place-items:center}.camera-preview video,.camera-preview img{width:100%;height:100%;object-fit:cover}.camera-placeholder{color:var(--muted);font-size:11px;padding:30px;text-align:center}.camera-controls{display:grid;gap:10px;padding:14px}.camera-mode{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.camera-mode button{min-height:40px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:9px;font-weight:800}.camera-mode button.active{color:var(--accent);border-color:var(--accent)}.camera-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.camera-actions button{min-height:48px}.camera-status{font-size:10px;color:var(--muted);line-height:1.5}.ocr-result{display:grid;gap:8px;margin-top:10px}.ocr-field{display:grid;gap:5px}.ocr-field label{font-size:9px;color:var(--muted);font-weight:800;letter-spacing:.06em}.ocr-field input{width:100%;box-sizing:border-box}.ocr-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.ocr-raw{white-space:pre-wrap;max-height:180px;overflow:auto;font-size:10px;color:var(--muted);background:var(--surface-2);padding:10px;border-radius:10px}.ocr-confidence{font-size:10px;font-weight:800}.ocr-grid{display:grid;gap:9px}@media(max-width:560px){.camera-mode{grid-template-columns:repeat(2,1fr)}}
        `; document.head.appendChild(s);
    }

    function mount() {
        if (document.getElementById("cameraOcrPage")) return;
        const main = document.querySelector("main"); if (!main) return;
        main.insertAdjacentHTML("beforeend", `<section id="cameraOcrPage" class="page" tabindex="-1" aria-labelledby="camera-ocr-title"><div class="page-heading"><span class="eyebrow">CAPTURE</span><h1 id="camera-ocr-title">Camera</h1></div><div class="camera-ocr"><div class="camera-panel"><div id="cameraPreview" class="camera-preview"><div class="camera-placeholder">Camera is off.<br>Choose what you want DRIVE to read.</div></div><div class="camera-controls"><div id="cameraModes" class="camera-mode" role="group" aria-label="OCR capture type">${Object.entries(MODES).map(([key,label])=>`<button type="button" data-ocr-mode="${key}">${esc(label)}</button>`).join("")}</div><div class="camera-actions"><button type="button" class="large-action" id="cameraStart">START CAMERA</button><button type="button" class="large-action" id="cameraCapture" disabled>CAPTURE</button></div><div id="cameraStatus" class="camera-status" role="status" aria-live="polite">Local capture ready.</div><canvas id="cameraCanvas" hidden></canvas><div id="ocrResult" class="ocr-result hidden"></div></div></div></div></section>`);
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
            state.capturedImage = null; state.ocrText = "";
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

    async function loadTesseract() {
        if (window.Tesseract) return window.Tesseract;
        await new Promise((resolve, reject) => { const existing = document.querySelector('script[data-drive-tesseract]'); if (existing) { existing.addEventListener("load", resolve, { once:true }); existing.addEventListener("error", reject, { once:true }); return; } const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"; script.async = true; script.dataset.driveTesseract = "true"; script.onload = resolve; script.onerror = () => reject(new Error("OCR engine could not be loaded")); document.head.appendChild(script); });
        if (!window.Tesseract?.createWorker) throw new Error("OCR engine loaded without worker support");
        return window.Tesseract;
    }

    function parseText(text) {
        const clean = String(text || "").replace(/\r/g, "");
        const lines = clean.split("\n").map(x => x.trim()).filter(Boolean);
        const allNumbers = [...clean.matchAll(/\b\d{4,8}\b/g)].map(m => Number(m[0]));
        const dates = [...clean.matchAll(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g)].map(m => dateValue(m[0])).filter(Boolean);
        if (state.mode === "odometer") {
            const odometer = allNumbers.filter(n => n >= 10000 && n <= 99999999).sort((a,b) => a-b)[0] || "";
            return { odometer, confidence: odometer ? "OCR detected a plausible odometer value. Verify it before saving." : "No clear odometer value found." };
        }
        if (state.mode === "service") {
            const odometer = allNumbers.filter(n => n >= 10000 && n <= 99999999).sort((a,b) => a-b)[0] || "";
            const costMatch = clean.match(/(?:P|BWP|TOTAL|AMOUNT|COST)\s*[:=]?\s*([0-9]+[.,][0-9]{1,2})/i);
            const cost = costMatch ? num(costMatch[1]) : "";
            const title = lines.find(x => /service|maintenance|repair|inspection|oil|brake|filter/i.test(x)) || lines[0] || "Service record";
            return { title: title.slice(0,80), description: lines.slice(0,6).join(" — ").slice(0,500), odometer, cost, date: dates[0] || new Date().toISOString().slice(0,10), confidence: odometer || cost || dates.length ? "Review detected service values before saving." : "No strong service fields detected." };
        }
        if (state.mode === "fuel") {
            const litreMatch = clean.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:L|LTR|LITRE|LITRES)\b/i);
            const priceMatch = clean.match(/(?:P|BWP)?\s*([0-9]+[.,][0-9]{2})\s*(?:\/\s*L|PER\s*L(?:ITRE)?)/i);
            const totalMatch = clean.match(/(?:TOTAL|AMOUNT|SALE|PURCHASE)\s*[:=]?\s*(?:P|BWP)?\s*([0-9]+[.,][0-9]{2})/i);
            const odometer = allNumbers.filter(n => n >= 10000 && n <= 99999999).sort((a,b) => a-b)[0] || "";
            return { litres: litreMatch ? num(litreMatch[1]) : "", pricePerLitre: priceMatch ? num(priceMatch[1]) : "", cost: totalMatch ? num(totalMatch[1]) : "", odometer, date: dates[0] || new Date().toISOString().slice(0,10), confidence: litreMatch || totalMatch ? "Fuel values detected. Verify every value before saving." : "No strong fuel fields detected." };
        }
        const tyre = clean.match(/\b(\d{3})\s*[\/-]\s*(\d{2})\s*R\s*(\d{2})\b/i);
        const pressure = clean.match(/(?:PSI|BAR)\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)/i);
        return { tyreSize: tyre ? `${tyre[1]}/${tyre[2]} R${tyre[3]}` : "", pressure: pressure ? pressure[1] : "", confidence: tyre ? "Tyre size detected. Verify the sidewall reading." : "No clear tyre size detected." };
    }

    function field(label, id, value, type="text") { return `<div class="ocr-field"><label for="${id}">${esc(label)}</label><input id="${id}" type="${type}" value="${esc(value)}"></div>`; }

    function renderResult(parsed) {
        const result = document.getElementById("ocrResult"); if (!result) return;
        let fields = "";
        if (state.mode === "fuel") fields = field("LITRES", "ocrLitres", parsed.litres, "number") + field("TOTAL COST (P)", "ocrCost", parsed.cost, "number") + field("ODOMETER (KM)", "ocrOdometer", parsed.odometer, "number") + field("DATE", "ocrDate", parsed.date, "date");
        if (state.mode === "service") fields = field("SERVICE / REPAIR", "ocrTitle", parsed.title) + field("DESCRIPTION", "ocrDescription", parsed.description) + field("ODOMETER (KM)", "ocrOdometer", parsed.odometer, "number") + field("COST (P)", "ocrCost", parsed.cost, "number") + field("DATE", "ocrDate", parsed.date, "date");
        if (state.mode === "odometer") fields = field("ODOMETER (KM)", "ocrOdometer", parsed.odometer, "number");
        if (state.mode === "tyre") fields = field("TYRE SIZE", "ocrTyreSize", parsed.tyreSize) + field("PRESSURE", "ocrPressure", parsed.pressure);
        result.innerHTML = `<div class="panel"><strong>OCR RESULT</strong><div class="ocr-confidence">${esc(parsed.confidence)}</div><div class="ocr-grid">${fields}</div><details><summary>RAW OCR TEXT</summary><div class="ocr-raw">${esc(state.ocrText || "No text returned")}</div></details><div class="ocr-actions"><button type="button" id="ocrSave" class="submit-button">${state.mode === "tyre" ? "KEEP FOR REVIEW" : "SAVE TO DRIVE"}</button><button type="button" id="ocrDiscard" class="large-action">DISCARD</button></div></div>`;
        document.getElementById("ocrSave")?.addEventListener("click", saveResult);
        document.getElementById("ocrDiscard")?.addEventListener("click", reset);
    }

    async function prepareOcr() {
        setStatus("Capture complete. Nothing is saved yet. Run OCR to extract fields.");
        const result = document.getElementById("ocrResult"); if (!result) return;
        result.classList.remove("hidden"); result.innerHTML = `<div class="panel"><strong>REVIEW BEFORE SAVING</strong><p class="camera-status">OCR runs only when you request it. Detected values will remain editable before DRIVE writes anything to your vehicle records.</p><div class="ocr-actions"><button type="button" id="ocrRun" class="submit-button">RUN OCR</button><button type="button" id="ocrDiscard" class="large-action">DISCARD</button></div></div>`;
        document.getElementById("ocrRun")?.addEventListener("click", runOcr); document.getElementById("ocrDiscard")?.addEventListener("click", reset);
    }

    async function runOcr() {
        if (!state.capturedImage) return;
        const result = document.getElementById("ocrResult"); const runButton = document.getElementById("ocrRun"); if (runButton) runButton.disabled = true;
        setStatus("Loading local OCR engine… first run may take a little longer.");
        try {
            const Tesseract = await loadTesseract();
            const worker = await Tesseract.createWorker("eng", 1, { logger: message => { if (message.status && typeof message.progress === "number") setStatus(`OCR: ${message.status} ${Math.round(message.progress * 100)}%`); } });
            const output = await worker.recognize(state.capturedImage);
            state.ocrText = output?.data?.text || "";
            state.confidence = output?.data?.confidence ?? null;
            await worker.terminate();
            const parsed = parseText(state.ocrText);
            renderResult(parsed);
            setStatus(`OCR complete${state.confidence != null ? ` · confidence ${Math.round(state.confidence)}%` : ""}. Check the fields before saving.`);
        } catch (error) { console.error("DRIVE OCR failed", error); if (result) result.innerHTML = `<div class="panel"><strong>OCR UNAVAILABLE</strong><p class="camera-status">The camera capture is safe and intact, but the OCR engine could not be loaded or started. Reconnect once and try again.</p><div class="ocr-actions"><button type="button" id="ocrRetry" class="submit-button">RETRY OCR</button><button type="button" id="ocrDiscard" class="large-action">DISCARD</button></div></div>`; result?.querySelector("#ocrRetry")?.addEventListener("click", runOcr); result?.querySelector("#ocrDiscard")?.addEventListener("click", reset); setStatus("OCR could not start. No data was saved."); }
    }

    async function saveResult() {
        const active = await getActiveVehicle(); if (!active) { setStatus("No active vehicle is available. Nothing was saved."); return; }
        try {
            if (state.mode === "fuel") {
                const odometer = Number(document.getElementById("ocrOdometer")?.value), litres = Number(document.getElementById("ocrLitres")?.value), cost = Number(document.getElementById("ocrCost")?.value), date = document.getElementById("ocrDate")?.value;
                if (!(litres > 0) || !(cost >= 0) || !(odometer >= 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Check fuel fields");
                const records = (await getAllRecords("fuel")).filter(r => !r.vehicleId || r.vehicleId === active.id).sort((a,b) => Number(b.odometer||0)-Number(a.odometer||0));
                const previous = records.find(r => Number(r.odometer) < odometer) || records[0] || null;
                const distance = previous && odometer > Number(previous.odometer) ? odometer - Number(previous.odometer) : null;
                await addRecord("fuel", { vehicleId: active.id, odometer, litres, cost, date, distance, economy: distance ? litres / distance * 100 : null, costPerKm: distance ? cost / distance : null, source: "camera-ocr", ocrConfidence: state.confidence, ocrCapturedAt: new Date().toISOString(), createdAt: new Date().toISOString(), synced: false });
                if (odometer > Number(active.odometer || 0)) { active.odometer = odometer; await putRecord("vehicles", active); }
                window.dispatchEvent(new CustomEvent("drive:datachanged", { detail: { store: "fuel" } }));
                setStatus("Fuel record saved to DRIVE.");
            } else if (state.mode === "service") {
                const title = document.getElementById("ocrTitle")?.value.trim(), description = document.getElementById("ocrDescription")?.value.trim(), odometer = Number(document.getElementById("ocrOdometer")?.value), cost = Number(document.getElementById("ocrCost")?.value), date = document.getElementById("ocrDate")?.value;
                if (!title || !(odometer >= 0) || !(cost >= 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Check service fields");
                await addRecord("maintenance", { vehicleId: active.id, title, description, odometer, cost, date, intervalKm: null, intervalMonths: null, nextServiceOdometer: null, nextServiceDate: null, source: "camera-ocr", ocrConfidence: state.confidence, ocrCapturedAt: new Date().toISOString(), createdAt: new Date().toISOString(), synced: false });
                window.dispatchEvent(new CustomEvent("drive:datachanged", { detail: { store: "maintenance" } }));
                setStatus("Service record saved to DRIVE.");
            } else if (state.mode === "odometer") {
                const odometer = Number(document.getElementById("ocrOdometer")?.value);
                if (!(odometer >= 0) || odometer > 99999999 || odometer < Number(active.odometer || 0)) throw new Error("Odometer must be valid and not lower than the current vehicle value");
                active.odometer = odometer; await putRecord("vehicles", active); window.dispatchEvent(new CustomEvent("drive:datachanged", { detail: { store: "vehicles" } })); setStatus("Vehicle odometer updated.");
            } else {
                setStatus("Tyre reading kept for review. DRIVE will add tyre records to the vehicle data model before saving them permanently.");
                return;
            }
            renderSaved();
        } catch (error) { console.error("DRIVE OCR save failed", error); setStatus("The detected values were not saved. Check the fields and try again."); }
    }

    function renderSaved() { const result = document.getElementById("ocrResult"); if (result) result.innerHTML = `<div class="panel"><strong>SAVED</strong><p class="camera-status">The confirmed ${esc(MODES[state.mode].toLowerCase())} has been added to DRIVE. You can return to More or capture another item.</p><div class="ocr-actions"><button type="button" id="ocrAgain" class="submit-button">CAPTURE ANOTHER</button></div></div>`; document.getElementById("ocrAgain")?.addEventListener("click", reset); }

    function reset() { state.capturedImage = null; state.ocrText = ""; state.confidence = null; stop(); const preview = document.getElementById("cameraPreview"); if (preview) preview.innerHTML = `<div class="camera-placeholder">Camera is off.<br>Choose what you want DRIVE to read.</div>`; const result = document.getElementById("ocrResult"); result?.classList.add("hidden"); document.getElementById("cameraCapture")?.setAttribute("disabled", "true"); document.getElementById("cameraStart")?.removeAttribute("disabled"); document.getElementById("cameraStart").textContent = "START CAMERA"; setStatus("Local capture ready."); }

    function open() { mount(); document.querySelectorAll(".page").forEach(p => p.classList.remove("active")); document.getElementById("cameraOcrPage")?.classList.add("active"); document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active")); document.getElementById("cameraOcrPage")?.focus?.({ preventScroll: true }); }

    window.DRIVE_CAMERA = { open, start, capture, stop, reset };
    document.addEventListener("DOMContentLoaded", () => { styles(); mount(); });
})();
