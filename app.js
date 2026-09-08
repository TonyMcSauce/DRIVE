/* DRIVE v0.4 — application controller */
(() => {
  const VERSION = "v0.4.0";
  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");
  const toast = document.getElementById("toast");
  let tripRunning = false;
  let tripTimer = null;
  let tripSeconds = 0;
  let activeTrip = null;
  let watchId = null;
  let lastPosition = null;

  const $ = id => document.getElementById(id);

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function activatePage(id) {
    pages.forEach(page => page.classList.toggle("active", page.id === id));
    navItems.forEach(item => item.classList.toggle("active", item.dataset.page === id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navItems.forEach(item => item.addEventListener("click", () => activatePage(item.dataset.page)));

  function formatNumber(value, decimals = 0) {
    return Number(value || 0).toLocaleString("en-BW", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatCurrency(value) {
    return `P${formatNumber(value, 2)}`;
  }

  async function getVehicle() {
    return DriveDB.get(DRIVE_STORES.vehicle, "primary");
  }

  async function updateDashboard() {
    const vehicle = await getVehicle();
    const fuel = await DriveDB.getAll(DRIVE_STORES.fuel);
    const trips = await DriveDB.getAll(DRIVE_STORES.trips);

    if (!vehicle) return;

    $("dashboardOdometer").textContent = formatNumber(vehicle.odometer);
    $("carOdometer").textContent = `${formatNumber(vehicle.odometer)} km`;
    $("healthNumber").innerHTML = `${formatNumber(vehicle.health)} <span>/100</span>`;
    $("healthBar").style.width = `${Math.max(0, Math.min(100, vehicle.health))}%`;

    const validFuel = fuel.filter(x => Number(x.litres) > 0 && Number(x.amount) >= 0);
    const recentFuel = [...validFuel].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latest = recentFuel[0];

    if (latest) {
      $("latestFuelTitle").textContent = `${formatNumber(latest.litres, 1)} L`;
      $("latestFuelMeta").textContent = `${formatCurrency(latest.amount)} · ${formatNumber(latest.odometer)} km`;
      $("latestFuelRight").textContent = relativeDate(latest.createdAt);
    }

    const previous = recentFuel.length > 1 ? recentFuel[1] : null;
    let economy = 8.47;
    if (latest && previous && latest.odometer > previous.odometer) {
      economy = (latest.litres / (latest.odometer - previous.odometer)) * 100;
    }

    const totalFuel = validFuel.reduce((sum, x) => sum + Number(x.litres || 0), 0);
    const totalSpend = validFuel.reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const distanceFromFuel = previous && latest ? Math.max(0, latest.odometer - previous.odometer) : 0;
    const costPerKm = distanceFromFuel > 0 ? totalSpend / distanceFromFuel : 1.24;

    $("fuelEconomyValue").textContent = formatNumber(economy, 2);
    $("costPerKmValue").textContent = formatCurrency(costPerKm);
    $("fuelAvgEconomy").textContent = formatNumber(economy, 2);
    $("fuelAvgPrice").textContent = formatCurrency(totalFuel > 0 ? totalSpend / totalFuel : 14.84);

    const recentTrips = [...trips].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    const lastTrip = recentTrips[0];
    if (lastTrip) {
      $("latestTripTitle").textContent = lastTrip.name || "Drive";
      $("latestTripMeta").textContent = `${formatNumber(lastTrip.distance, 1)} km · ${formatDuration(lastTrip.durationSeconds || 0)}`;
      $("latestTripRight").textContent = lastTrip.cost ? formatCurrency(lastTrip.cost) : "—";
    }

    renderFuelHistory(recentFuel);
    renderTripHistory(recentTrips);
  }

  function relativeDate(date) {
    const d = new Date(date);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  }

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
  }

  function renderFuelHistory(entries) {
    const list = $("fuelHistory");
    if (!list) return;
    list.innerHTML = entries.slice(0, 8).map(entry => `
      <div class="activity-row static-row">
        <span class="activity-icon"><svg viewBox="0 0 24 24"><use href="#icon-gas"/></svg></span>
        <span class="activity-main"><strong>${formatNumber(entry.litres, 1)} L</strong><small>${formatCurrency(entry.amount)} · ${formatNumber(entry.odometer)} km${entry.station ? ` · ${escapeHtml(entry.station)}` : ""}</small></span>
        <span class="activity-right">${relativeDate(entry.createdAt)}</span>
      </div>`).join("");
  }

  function renderTripHistory(entries) {
    const list = $("tripHistory");
    if (!list) return;
    if (!entries.length) {
      list.innerHTML = `<div class="empty-card"><svg viewBox="0 0 24 24"><use href="#icon-route"/></svg><strong>Your drives will appear here</strong><span>Start a drive to begin building your history.</span></div>`;
      return;
    }
    list.innerHTML = entries.slice(0, 8).map(entry => `
      <div class="activity-row static-row">
        <span class="activity-icon"><svg viewBox="0 0 24 24"><use href="#icon-route"/></svg></span>
        <span class="activity-main"><strong>${escapeHtml(entry.name || "Drive")}</strong><small>${formatNumber(entry.distance, 1)} km · ${formatDuration(entry.durationSeconds || 0)}</small></span>
        <span class="activity-right">${entry.cost ? formatCurrency(entry.cost) : "—"}</span>
      </div>`).join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }

  function updateTripUI() {
    const driveButtons = [$('driveButton'), $('tripToggle')];
    driveButtons.forEach(button => {
      if (!button) return;
      const text = button.querySelector("span:last-child");
      if (text) text.textContent = tripRunning ? "END DRIVE" : "START DRIVE";
      const icon = button.querySelector("use");
      if (icon) icon.setAttribute("href", tripRunning ? "#icon-stop" : "#icon-play");
    });
    $("gpsStatus").textContent = tripRunning ? "Tracking" : "Ready";
    $("tripLiveCard").classList.toggle("tracking", tripRunning);
  }

  function haversineKm(a, b) {
    const R = 6371;
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLon = (b.lon - a.lon) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function handlePosition(position) {
    if (!tripRunning) return;
    const current = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      accuracy: position.coords.accuracy
    };

    if (lastPosition && current.accuracy <= 100) {
      const segment = haversineKm(lastPosition, current);
      if (segment > 0.005 && segment < 1) {
        activeTrip.distance += segment;
        $("liveDistance").textContent = activeTrip.distance.toFixed(2);
      }
    }
    lastPosition = current;
  }

  function handlePositionError(error) {
    const messages = {
      1: "Location permission needed",
      2: "Location unavailable",
      3: "Location request timed out"
    };
    $("gpsStatus").textContent = messages[error.code] || "GPS unavailable";
  }

  function startGps() {
    if (!("geolocation" in navigator)) {
      showToast("This device does not provide GPS");
      return false;
    }
    watchId = navigator.geolocation.watchPosition(handlePosition, handlePositionError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000
    });
    return true;
  }

  function stopGps() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    lastPosition = null;
  }

  async function toggleTrip() {
    if (!tripRunning) {
      tripRunning = true;
      tripSeconds = 0;
      activeTrip = { name: "Drive", distance: 0, startedAt: new Date().toISOString() };
      tripTimer = setInterval(() => {
        tripSeconds++;
        $("liveDuration").textContent = `${String(Math.floor(tripSeconds / 60)).padStart(2, "0")}:${String(tripSeconds % 60).padStart(2, "0")}`;
      }, 1000);
      startGps();
      updateTripUI();
      showToast("Drive started — GPS tracking active");
      return;
    }

    tripRunning = false;
    clearInterval(tripTimer);
    stopGps();
    activeTrip.durationSeconds = tripSeconds;
    activeTrip.endedAt = new Date().toISOString();

    const vehicle = await getVehicle();
    const costPerKm = 1.24;
    activeTrip.cost = Number((activeTrip.distance * costPerKm).toFixed(2));
    await DriveDB.add(DRIVE_STORES.trips, activeTrip);

    updateTripUI();
    await updateDashboard();
    showToast(`Drive saved · ${activeTrip.distance.toFixed(2)} km`);
    activeTrip = null;
    void vehicle;
  }

  $("driveButton").addEventListener("click", toggleTrip);
  $("tripToggle").addEventListener("click", toggleTrip);

  $("addFuelButton").addEventListener("click", () => {
    activatePage("fuelPage");
    setTimeout(() => $("fuelOdometer").focus(), 250);
  });

  $("scanFuelButton").addEventListener("click", () => showToast("Camera/OCR module is next"));

  const fuelForm = $("manualFuelForm");
  const fuelOdometer = $("fuelOdometer");
  const fuelLitres = $("fuelLitres");
  const fuelAmount = $("fuelAmount");
  const fuelPricePreview = $("fuelPricePreview");

  function updateFuelPricePreview() {
    const litres = Number(fuelLitres.value);
    const amount = Number(fuelAmount.value);
    fuelPricePreview.textContent = litres > 0 && amount >= 0 ? formatCurrency(amount / litres) : "P0.00";
  }
  fuelLitres.addEventListener("input", updateFuelPricePreview);
  fuelAmount.addEventListener("input", updateFuelPricePreview);

  fuelForm.addEventListener("submit", async event => {
    event.preventDefault();
    const vehicle = await getVehicle();
    const odometer = Number(fuelOdometer.value);
    const litres = Number(fuelLitres.value);
    const amount = Number(fuelAmount.value);

    if (!Number.isFinite(odometer) || odometer <= 0 || litres <= 0 || amount < 0) {
      showToast("Check the fuel details");
      return;
    }
    if (vehicle && odometer < vehicle.odometer) {
      showToast("Odometer cannot be lower than the vehicle record");
      return;
    }

    await DriveDB.add(DRIVE_STORES.fuel, {
      odometer,
      litres,
      amount,
      station: $("fuelStation").value.trim(),
      source: "manual",
      createdAt: new Date().toISOString()
    });

    await DriveDB.put(DRIVE_STORES.vehicle, { ...vehicle, odometer });
    fuelForm.reset();
    updateFuelPricePreview();
    await updateDashboard();
    showToast("Fuel saved to DRIVE");
  });

  $("serviceButton").addEventListener("click", () => {
    activatePage("carPage");
    showToast("Maintenance profile");
  });
  $("moreButton").addEventListener("click", () => activatePage("morePage"));

  function updateConnection() {
    const online = navigator.onLine;
    $("connectionText").textContent = online ? "Online" : "Offline";
    document.body.classList.toggle("offline", !online);
    $("dataStorageText").textContent = online ? "Local data + update checks enabled" : "Local data available offline";
  }
  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      if (navigator.onLine) await registration.update();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            showToast("A new DRIVE version is ready");
          }
        });
      });
    } catch (error) {
      console.warn("Service worker registration failed", error);
    }
  }

  async function init() {
    document.title = `DRIVE ${VERSION} — Vehicle Intelligence`;
    $("appVersion").textContent = VERSION;
    $("footerVersion").textContent = VERSION;
    updateConnection();
    await DriveDB.init();
    await DriveDB.seed();
    await updateDashboard();
    await registerServiceWorker();
  }

  init().catch(error => {
    console.error(error);
    showToast("DRIVE data layer could not start");
  });
})();
