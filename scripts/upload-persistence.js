/**
 * Saves uploads in IndexedDB (and small text in localStorage) so they survive refresh.
 * Same browser / device only — not sent to a server.
 */
(function (global) {
  var DB_NAME = "reading-comprehension-uploads";
  var DB_VERSION = 1;
  var STORE = "files";
  var PREFIX = "reading-comprehension-upload-";

  var dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error("IndexedDB not available"));
        return;
      }
      var req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = function () {
        reject(req.error);
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
    });
    return dbPromise;
  }

  function fullKey(id) {
    return PREFIX + id;
  }

  function runTx(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var store = tx.objectStore(STORE);
        try {
          fn(store, resolve, reject);
        } catch (err) {
          reject(err);
        }
        tx.oncomplete = function () {
          db.close();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function setRecord(id, record) {
    return runTx("readwrite", function (store, resolve) {
      store.put(record, fullKey(id));
      resolve();
    });
  }

  function getRecord(id) {
    return runTx("readonly", function (store, resolve, reject) {
      var req = store.get(fullKey(id));
      req.onsuccess = function () {
        resolve(req.result || null);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function removeRecord(id) {
    return runTx("readwrite", function (store, resolve) {
      store.delete(fullKey(id));
      resolve();
    });
  }

  function setText(id, text) {
    try {
      global.localStorage.setItem(fullKey(id) + "-text", text);
    } catch (e) {
      /* quota */
    }
    return setRecord(id, { kind: "text", text: text, savedAt: Date.now() });
  }

  function getText(id) {
    return getRecord(id).then(function (rec) {
      if (rec && rec.kind === "text" && typeof rec.text === "string") return rec.text;
      try {
        return global.localStorage.getItem(fullKey(id) + "-text");
      } catch (e) {
        return null;
      }
    });
  }

  function setBlob(id, file) {
    if (!file) return Promise.resolve();
    return setRecord(id, {
      kind: "blob",
      blob: file,
      mimeType: file.type || "",
      name: file.name || "",
      savedAt: Date.now(),
    });
  }

  function getBlob(id) {
    return getRecord(id).then(function (rec) {
      if (!rec || rec.kind !== "blob" || !rec.blob) return null;
      return rec;
    });
  }

  function setNumber(id, value) {
    try {
      global.localStorage.setItem(fullKey(id) + "-num", String(value));
    } catch (e) {
      /* ignore */
    }
    return Promise.resolve();
  }

  function getNumber(id, fallback) {
    try {
      var raw = global.localStorage.getItem(fullKey(id) + "-num");
      if (raw == null || raw === "") return fallback;
      var n = parseFloat(raw);
      return isNaN(n) ? fallback : n;
    } catch (e) {
      return fallback;
    }
  }

  global.ReadingUploadStore = {
    setText: setText,
    getText: getText,
    setBlob: setBlob,
    getBlob: getBlob,
    remove: removeRecord,
    setNumber: setNumber,
    getNumber: getNumber,
    createObjectUrl: function (rec) {
      if (!rec || !rec.blob) return "";
      return global.URL.createObjectURL(rec.blob);
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
