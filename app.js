let currentPage = "dashboardPage";

let tripActive = false;

let tripTimer = null;

let tripStartedAt = null;


/* =========================================
   INITIALISE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await openDatabase();

        setupNavigation();

        setupActions();

        setupFuelForm();

        setupNetworkStatus();

        registerServiceWorker();

        setDefaultDate();

        loadFuelHistory();

    }
);


/* =========================================
   NAVIGATION
========================================= */

function setupNavigation() {

    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;

                    showPage(page);

                }
            );

        });

}


function showPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove("active");

        });


    document
        .getElementById(pageId)
        .classList.add("active");


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.page === pageId
            );

        });


    currentPage = pageId;

}


/* =========================================
   ACTIONS
========================================= */

function setupActions() {

    document
        .querySelectorAll(
            '[data-action="fuel"]'
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                openFuelModal
            );

        });


    document
        .querySelectorAll(
            '[data-action="service"]'
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    alert(
                        "Maintenance module coming next."
                    );

                }
            );

        });


    document
        .getElementById(
            "startDriveButton"
        )
        .addEventListener(
            "click",
            startDrive
        );


    document
        .getElementById(
            "stopDriveButton"
        )
        .addEventListener(
            "click",
            stopDrive
        );


    document
        .querySelectorAll(
            "[data-close]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    closeModal(
                        button.dataset.close
                    );

                }
            );

        });

}


/* =========================================
   FUEL MODAL
========================================= */

function openFuelModal() {

    const modal =
        document.getElementById(
            "fuelModal"
        );


    modal.classList.remove(
        "hidden"
    );


    document
        .getElementById(
            "fuelOdometer"
        )
        .value =
            document
                .getElementById(
                    "odometerValue"
                )
                .textContent
                .replace(",", "");


    document
        .getElementById(
            "fuelOdometer"
        )
        .focus();

}


function closeModal(id) {

    document
        .getElementById(id)
        .classList.add("hidden");

}


/* =========================================
   FUEL FORM
========================================= */

function setDefaultDate() {

    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    document
        .getElementById(
            "fuelDate"
        )
        .value = today;

}


function setupFuelForm() {

    const form =
        document.getElementById(
            "fuelForm"
        );


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const odometer =
                Number(
                    document
                        .getElementById(
                            "fuelOdometer"
                        )
                        .value
                );


            const litres =
                Number(
                    document
                        .getElementById(
                            "fuelLitres"
                        )
                        .value
                );


            const cost =
                Number(
                    document
                        .getElementById(
                            "fuelCost"
                        )
                        .value
                );


            const date =
                document
                    .getElementById(
                        "fuelDate"
                    )
                    .value;


            const previous =
                await getLatestRecord(
                    "fuel"
                );


            let distance = null;

            let economy = null;

            let costPerKm = null;


            if (
                previous &&
                odometer > previous.odometer
            ) {

                distance =
                    odometer -
                    previous.odometer;


                economy =
                    (
                        litres /
                        distance
                    ) * 100;


                costPerKm =
                    cost /
                    distance;

            }


            const entry = {

                odometer,

                litres,

                cost,

                date,

                distance,

                economy,

                costPerKm,

                createdAt:
                    new Date().toISOString(),

                synced: false

            };


            await addRecord(
                "fuel",
                entry
            );


            /*
             * Update dashboard.
             */

            document
                .getElementById(
                    "odometerValue"
                )
                .textContent =
                    odometer.toLocaleString();


            if (economy) {

                document
                    .getElementById(
                        "fuelEconomy"
                    )
                    .textContent =
                        economy.toFixed(2);

            }


            if (costPerKm) {

                document
                    .getElementById(
                        "costPerKm"
                    )
                    .textContent =
                        `P${costPerKm.toFixed(2)}`;

            }


            closeModal(
                "fuelModal"
            );


            form.reset();

            setDefaultDate();

            loadFuelHistory();

        }
    );


    [
        "fuelOdometer",
        "fuelLitres",
        "fuelCost"
    ]
    .forEach(id => {

        document
            .getElementById(id)
            .addEventListener(
                "input",
                previewFuel
            );

    });

}


async function previewFuel() {

    const odometer =
        Number(
            document
                .getElementById(
                    "fuelOdometer"
                )
                .value
        );


    const litres =
        Number(
            document
                .getElementById(
                    "fuelLitres"
                )
                .value
        );


    if (
        !odometer ||
        !litres
    ) {

        return;

    }


    const previous =
        await getLatestRecord(
            "fuel"
        );


    if (
        !previous ||
        odometer <= previous.odometer
    ) {

        return;

    }


    const distance =
        odometer -
        previous.odometer;


    const economy =
        (
            litres /
            distance
        ) * 100;


    document
        .getElementById(
            "fuelCalculation"
        )
        .classList.remove(
            "hidden"
        );


    document
        .getElementById(
            "calculatedEconomy"
        )
        .textContent =
            economy.toFixed(2);

}


/* =========================================
   FUEL HISTORY
========================================= */

async function loadFuelHistory() {

    const records =
        await getAllRecords(
            "fuel"
        );


    const container =
        document
            .getElementById(
                "fuelHistory"
            );


    container.innerHTML = "";


    records
        .sort(
            (a, b) =>
                b.odometer -
                a.odometer
        )
        .slice(0, 10)
        .forEach(record => {

            const element =
                document.createElement(
                    "article"
                );


            element.className =
                "activity";


            element.innerHTML = `

                <div class="activity-icon fuel">
                    ⛽
                </div>

                <div class="activity-info">

                    <strong>
                        ${record.litres.toFixed(1)} L
                    </strong>

                    <span>
                        P${record.cost.toFixed(2)}
                        · ${record.odometer.toLocaleString()} km
                    </span>

                </div>

                <div class="activity-value">
                    ${
                        record.economy
                            ? record.economy.toFixed(2)
                            : "—"
                    }
                    ${
                        record.economy
                            ? " L/100"
                            : ""
                    }
                </div>

            `;


            container.appendChild(
                element
            );

        });

}


/* =========================================
   GPS / TRIPS
========================================= */

function startDrive() {

    if (!navigator.geolocation) {

        alert(
            "Your browser does not support GPS."
        );

        return;

    }


    tripActive = true;

    tripStartedAt =
        Date.now();


    GPS.start();


    document
        .getElementById(
            "tripLiveCard"
        )
        .classList.remove(
            "hidden"
        );


    document
        .getElementById(
            "startDriveButton"
        )
        .textContent =
            "DRIVING";


    showPage(
        "tripsPage"
    );


    tripTimer =
        setInterval(
            updateTripTimer,
            1000
        );

}


async function stopDrive() {

    if (!tripActive) {
        return;
    }


    GPS.stop();


    clearInterval(
        tripTimer
    );


    const endedAt =
        Date.now();


    const trip = {

        startTime:
            new Date(
                tripStartedAt
            ).toISOString(),

        endTime:
            new Date(
                endedAt
            ).toISOString(),

        distance:
            GPS.distance,

        points:
            GPS.points,

        createdAt:
            new Date().toISOString(),

        synced: false

    };


    await addRecord(
        "trips",
        trip
    );


    tripActive = false;


    document
        .getElementById(
            "tripLiveCard"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "startDriveButton"
        )
        .textContent =
            "● START DRIVE";


    alert(
        `Trip saved: ${GPS.distance.toFixed(2)} km`
    );


    GPS.points = [];

    GPS.distance = 0;

}


function updateTripTimer() {

    if (!tripStartedAt) {
        return;
    }


    const elapsed =
        Date.now() -
        tripStartedAt;


    const seconds =
        Math.floor(
            elapsed / 1000
        );


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remaining =
        seconds % 60;


    document
        .getElementById(
            "liveDuration"
        )
        .textContent =
            `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;

}


document.addEventListener(
    "gpsupdate",
    event => {

        const {
            point,
            distance
        } = event.detail;


        document
            .getElementById(
                "liveDistance"
            )
            .textContent =
                `${distance.toFixed(2)} km`;


        document
            .getElementById(
                "liveAccuracy"
            )
            .textContent =
                `GPS ±${Math.round(point.accuracy)} m`;

    }
);


/* =========================================
   NETWORK
========================================= */

function setupNetworkStatus() {

    function update() {

        const status =
            document
                .getElementById(
                    "networkStatus"
                );


        const text =
            document
                .getElementById(
                    "networkText"
                );


        if (navigator.onLine) {

            status.classList.add(
                "hidden"
            );

        }

        else {

            status.classList.remove(
                "hidden"
            );


            text.textContent =
                "Offline — data saved locally";

        }

    }


    window.addEventListener(
        "online",
        update
    );


    window.addEventListener(
        "offline",
        update
    );


    update();

}


/* =========================================
   SERVICE WORKER
========================================= */

async function registerServiceWorker() {

    if (
        !("serviceWorker" in navigator)
    ) {

        return;

    }


    try {

        const registration =
            await navigator.serviceWorker.register(
                "./sw.js",
                {
                    updateViaCache: "none"
                }
            );


        console.log(
            "DRIVE service worker registered."
        );


        /*
         * Explicit update check whenever
         * the app becomes visible again.
         */

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState ===
                    "visible"
                ) {

                    registration.update();

                }

            }
        );


        registration.addEventListener(
            "updatefound",
            () => {

                const worker =
                    registration.installing;


                worker.addEventListener(
                    "statechange",
                    () => {

                        if (
                            worker.state ===
                            "installed" &&
                            navigator.serviceWorker.controller
                        ) {

                            showUpdatePrompt(
                                worker
                            );

                        }

                    }
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Service worker registration failed:",
            error
        );

    }

}


function showUpdatePrompt(worker) {

    const modal =
        document.getElementById(
            "updateModal"
        );


    modal.classList.remove(
        "hidden"
    );


    document
        .getElementById(
            "updateButton"
        )
        .onclick = () => {

            worker.postMessage({
                type: "SKIP_WAITING"
            });

            window.location.reload();

        };

}
