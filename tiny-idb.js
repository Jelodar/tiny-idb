/**
 * tiny-idb - A super simple, fast, and dependency-free IndexedDB wrapper.
 * Designed as a drop-in replacement for localStorage with durability and performance.
 *
 * @author Jelodar
 * @license MIT
 */

const DB_NAME = 'tiny-idb', STORE_NAME = 's', VERSION = 1;
let dbPromise;

const getDB = () => dbPromise || (dbPromise = new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, VERSION);
  req.onupgradeneeded = e => e.target.result.createObjectStore(STORE_NAME);
  req.onsuccess = e => {
    const db = e.target.result;
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
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_NAME, mode);
    let res;
    try { res = cb(t.objectStore(STORE_NAME)); } catch (e) { t.abort(); return reject(e); }
    t.oncomplete = () => resolve(res);
    t.onerror = () => reject(t.error);
  });
};

export const tinyIDB = {
  set: (k, v) => tx('readwrite', s => prom(s.put(v, k))),
  get: k => tx('readonly', s => prom(s.get(k))),
  remove: k => tx('readwrite', s => prom(s.delete(k))),
  clear: () => tx('readwrite', s => prom(s.clear())),
  keys: () => tx('readonly', s => prom(s.getAllKeys())),
  values: () => tx('readonly', s => prom(s.getAll())),
  count: () => tx('readonly', s => prom(s.count())),
  update: async (k, fn) => tx('readwrite', async s => {
    const n = await fn(await prom(s.get(k)));
    return prom(s.put(n, k));
  }),
  push: (k, v) => tinyIDB.update(k, c => [...(Array.isArray(c) ? c : []), v]),
  merge: (k, p) => tinyIDB.update(k, c => ({ ...(c && typeof c === 'object' ? c : {}), ...p }))
};

export default tinyIDB;
