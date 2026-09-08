const DRIVE_DB = "drive-db";
const DRIVE_DB_VERSION = 1;

let dbInstance = null;


function openDatabase() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(
            DRIVE_DB,
            DRIVE_DB_VERSION
        );


        request.onupgradeneeded = event => {

            const db = event.target.result;


            if (!db.objectStoreNames.contains("vehicles")) {

                db.createObjectStore(
                    "vehicles",
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

            }


            if (!db.objectStoreNames.contains("fuel")) {

                const store = db.createObjectStore(
                    "fuel",
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

                store.createIndex(
                    "odometer",
                    "odometer"
                );

                store.createIndex(
                    "date",
                    "date"
                );

            }


            if (!db.objectStoreNames.contains("trips")) {

                const store = db.createObjectStore(
                    "trips",
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

                store.createIndex(
                    "startTime",
                    "startTime"
                );

            }


            if (!db.objectStoreNames.contains("maintenance")) {

                db.createObjectStore(
                    "maintenance",
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

            }


            if (!db.objectStoreNames.contains("expenses")) {

                db.createObjectStore(
                    "expenses",
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

            }

        };


        request.onsuccess = () => {

            dbInstance = request.result;

            resolve(dbInstance);

        };


        request.onerror = () => {

            reject(request.error);

        };

    });

}


async function addRecord(storeName, data) {

    const db = dbInstance || await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            storeName,
            "readwrite"
        );

        const store =
            transaction.objectStore(storeName);


        const request = store.add(data);


        request.onsuccess = () => {

            resolve(request.result);

        };


        request.onerror = () => {

            reject(request.error);

        };

    });

}


async function getAllRecords(storeName) {

    const db = dbInstance || await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            storeName,
            "readonly"
        );

        const store =
            transaction.objectStore(storeName);


        const request = store.getAll();


        request.onsuccess = () => {

            resolve(request.result);

        };


        request.onerror = () => {

            reject(request.error);

        };

    });

}


async function getLatestRecord(storeName) {

    const records =
        await getAllRecords(storeName);


    if (!records.length) {
        return null;
    }


    return records.sort(
        (a, b) => {

            const dateA =
                new Date(a.date || a.startTime || 0);

            const dateB =
                new Date(b.date || b.startTime || 0);

            return dateB - dateA;

        }
    )[0];

}
