/** tiny-idb - MIT © Jelodar */

const instances = new Map();
const prom = (req) => new Promise((res, rej) => {
  req.onsuccess = () => res(req.result);
  req.onerror = () => rej(req.error);
});
const RO = 'readonly', RW = 'readwrite';

const getAPI = (dbName = 'tiny-idb', storeName = undefined) => {
  storeName = storeName || dbName;
  const key = dbName + '\0' + storeName;
  if (instances.has(key)) return instances.get(key);

  let dbPromise;
  const tx = async (mode, cb) => {
    const db = await (dbPromise || (dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(storeName);
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => { dbPromise = null; reject(req.error); };
    })));
    return new Promise(async (resolve, reject) => {
      const t = db.transaction(storeName, mode);
      t.onabort = t.onerror = () => reject(t.error || new DOMException('Aborted'));
      try {
        const res = await cb(t.objectStore(storeName));
        t.oncomplete = () => resolve(res);
      } catch (e) {
        try { t.abort(); } catch {}
        reject(e);
      }
    });
  };

  const update = (key, fn) => tx(RW, async s => prom(s.put(await fn(await prom(s.get(key))), key)));

  const api = {
    open: getAPI,
    set: (key, value) => tx(RW, s => prom(s.put(value, key))),
    get: key => tx(RO, s => prom(s.get(key))),
    remove: key => tx(RW, s => prom(s.delete(key))),
    clear: () => tx(RW, s => prom(s.clear())),
    keys: () => tx(RO, s => prom(s.getAllKeys())),
    values: () => tx(RO, s => prom(s.getAll())),
    count: () => tx(RO, s => prom(s.count())),
    update,
    push: (key, val) => update(key, (c = []) => [...(Array.isArray(c) ? c : []), val]),
    merge: (key, obj) => update(key, (c = {}) => ({ ...(c && typeof c === 'object' ? c : {}), ...obj }))
  };

  ['get', 'set', 'remove'].forEach(m => api[m + 'Item'] = api[m]);
  instances.set(key, api);
  return api;
};

export const tinyIDB = getAPI();
export default tinyIDB;
