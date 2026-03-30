/**
 * tiny-idb - A super simple, fast, and dependency-free IndexedDB wrapper.
 * Designed as a drop-in replacement for localStorage with durability and performance.
 *
 * @author Jelodar
 * @license MIT
 */

const DB_NAME = 'tiny-idb', STORE_NAME = 's', READ_WRITE = 'readwrite', READ_ONLY = 'readonly';
let dbPromise;

const getDB = () => dbPromise || (dbPromise = new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
  req.onsuccess = () => {
    const db = req.result;
    db.onversionchange = () => { db.close(); dbPromise = null; };
    resolve(db);
  };
  req.onerror = () => { dbPromise = null; reject(req.error); };
}));

const prom = (req) => new Promise((res, rej) => {
  req.onsuccess = () => res(req.result);
  req.onerror = () => rej(req.error);
});

const tx = async (mode, cb) => {
  const db = await getDB();
  return new Promise(async (resolve, reject) => {
    const t = db.transaction(STORE_NAME, mode);
    t.onabort = t.onerror = () => reject(t.error || new DOMException('Aborted'));
    try {
      const res = await cb(t.objectStore(STORE_NAME));
      t.oncomplete = () => resolve(res);
    } catch (e) {
      try { t.abort(); } catch {}
      reject(e);
    }
  });
};

export const tinyIDB = {
  set: (key, value) => tx(READ_WRITE, s => prom(s.put(value, key))),
  get: key => tx(READ_ONLY, s => prom(s.get(key))),
  remove: k => tx(READ_WRITE, s => prom(s.delete(k))),
  clear: () => tx(READ_WRITE, s => prom(s.clear())),
  keys: () => tx(READ_ONLY, s => prom(s.getAllKeys())),
  values: () => tx(READ_ONLY, s => prom(s.getAll())),
  count: () => tx(READ_ONLY, s => prom(s.count())),
  update: async (key, fn) => tx(READ_WRITE, async s => {
    const n = await fn(await prom(s.get(key)));
    return prom(s.put(n, key));
  }),
  push: (key, value) => tinyIDB.update(key, c => [...(Array.isArray(c) ? c : []), value]),
  merge: (key, patch) => tinyIDB.update(key, c => ({ ...(c && typeof c === 'object' ? c : {}), ...patch }))
};

['get', 'set', 'remove'].forEach(method => tinyIDB[method + 'Item'] = tinyIDB[method]);

export default tinyIDB;
