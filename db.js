/* DRIVE v0.4 — IndexedDB data layer */
const DRIVE_DB = "driveVehicleDB";
const DRIVE_DB_VERSION = 1;

const STORES = {
  vehicle: "vehicle",
  fuel: "fuel",
  trips: "trips",
  service: "service"
};

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

function openDriveDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DRIVE_DB, DRIVE_DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.vehicle)) {
        db.createObjectStore(STORES.vehicle, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORES.fuel)) {
        const store = db.createObjectStore(STORES.fuel, { keyPath: "id", autoIncrement: true });
        store.createIndex("odometer", "odometer", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.trips)) {
        const store = db.createObjectStore(STORES.trips, { keyPath: "id", autoIncrement: true });
        store.createIndex("startedAt", "startedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.service)) {
        const store = db.createObjectStore(STORES.service, { keyPath: "id", autoIncrement: true });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("odometer", "odometer", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const DriveDB = {
  async init() {
    if (!this._db) this._db = await openDriveDB();
    return this._db;
  },

  async get(storeName, key) {
    const db = await this.init();
    return requestToPromise(db.transaction(storeName, "readonly").objectStore(storeName).get(key));
  },

  async getAll(storeName) {
    const db = await this.init();
    return requestToPromise(db.transaction(storeName, "readonly").objectStore(storeName).getAll());
  },

  async add(storeName, value) {
    const db = await this.init();
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).add(value);
    const result = await requestToPromise(request);
    await transactionDone(tx);
    return result;
  },

  async put(storeName, value) {
    const db = await this.init();
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).put(value);
    const result = await requestToPromise(request);
    await transactionDone(tx);
    return result;
  },

  async remove(storeName, key) {
    const db = await this.init();
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    await transactionDone(tx);
  },

  async count(storeName) {
    const db = await this.init();
    return requestToPromise(db.transaction(storeName, "readonly").objectStore(storeName).count());
  },

  async seed() {
    const vehicle = await this.get(STORES.vehicle, "primary");
    if (!vehicle) {
      await this.put(STORES.vehicle, {
        id: "primary",
        make: "Lexus",
        model: "IS250",
        year: 2007,
        odometer: 128421,
        health: 87,
        fuelType: "Petrol",
        currency: "BWP",
        createdAt: new Date().toISOString()
      });
    }

    if (await this.count(STORES.fuel) === 0) {
      await this.add(STORES.fuel, {
        odometer: 128421,
        litres: 50.2,
        amount: 745,
        station: "",
        source: "seed",
        createdAt: new Date().toISOString()
      });
    }
  }
};

window.DriveDB = DriveDB;
window.DRIVE_STORES = STORES;
