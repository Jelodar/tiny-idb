export const MODE_RO = 'readonly';
export const MODE_RW = 'readwrite';
export const DIR_NEXT = 'next';
export const DIR_PREV = 'prev';

const instances = new Map();
const conns = new Map();

const wrap = req => new Promise((res, rej) => {
  req.onsuccess = () => res(req.result);
  req.onerror = () => rej(req.error);
});

const isObject = v => v && typeof v === 'object' && !Array.isArray(v);

const getAPI = (dbName = 'tiny-idb', storeName = dbName, batching = true) => {
  if (typeof storeName === 'boolean') [batching, storeName] = [storeName, dbName];
  
  const key = dbName + '\0' + storeName;
  if (instances.has(key)) return instances.get(key);

  let conn = conns.get(dbName);
  if (!conn) conns.set(dbName, conn = { names: new Set() });
  conn.names.add(storeName);

  let queue = [];
  
  const flush = async () => {
    const batch = queue; queue = [];
    try {
      const mode = batch.some(op => op.mode === MODE_RW) ? MODE_RW : MODE_RO;
      const results = await tx(mode, async store => {
        const res = [];
        for (const op of batch) res.push(await op.cb(store));
        return res;
      });
      batch.forEach((op, i) => op.res(results[i]));
    } catch (err) {
      batch.forEach(op => op.rej(err));
    }
  };

  const tx = async (mode, cb) => {
    while (1) {
      const db = await (conn.pr || (conn.pr = new Promise((res, rej) => {
        const init = ver => {
          const req = indexedDB.open(dbName, ver);
          req.onupgradeneeded = () => conn.names.forEach(n => req.result.objectStoreNames.contains(n) || req.result.createObjectStore(n));
          req.onsuccess = () => {
            const d = req.result;
            if ([...conn.names].some(n => !d.objectStoreNames.contains(n))) {
              d.close();
              init(d.version + 1);
            } else {
              d.onversionchange = () => { d.close(); conn.pr = 0; };
              res(d);
            }
          };
          req.onerror = () => { conn.pr = 0; rej(req.error); };
        };
        init();
      })));

      try {
        return await new Promise((resolve, reject) => {
          const t = db.transaction(storeName, mode);
          let done, closed, value;
          const fail = err => reject(err);
          
          t.oncomplete = () => {
            closed = 1;
            done ? resolve(value) : fail(new DOMException('Transaction closed', 'TransactionInactiveError'));
          };
          t.onabort = t.onerror = () => fail(t.error || new DOMException('Aborted'));
          
          Promise.resolve(cb(t.objectStore(storeName))).then(v => {
            done = 1; value = v;
            if (closed) resolve(v);
          }, err => {
            try { t.abort(); } catch {}
            fail(err);
          });
        });
      } catch (err) {
        if (err.name === 'InvalidStateError') {
          conn.pr = 0;
          continue;
        }
        throw err;
      }
    }
  };

  const operation = (mode, cb) => new Promise((res, rej) => {
    queue.push({ mode, cb, res, rej });
    if (queue.length < 2) batching ? queueMicrotask(flush) : flush();
  });

  const walk = (filter, limit, range, dir, returnObject) => operation(MODE_RO, store => new Promise((res, rej) => {
    const acc = [];
    const req = store.openCursor(range, dir);
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor || (limit != null && acc.length === limit)) return res(returnObject ? { items: acc, next: cursor ? cursor.key : null } : acc);
      if (!filter || filter(cursor.value, cursor.key)) acc.push([cursor.key, cursor.value]);
      cursor.continue();
    };
    req.onerror = () => rej(req.error);
  }));

  const update = (key, fn) => operation(MODE_RW, async store => wrap(store.put(await fn(await wrap(store.get(key))), key)));

  const api = {
    open: getAPI,
    MODE_RO, MODE_RW, DIR_NEXT, DIR_PREV,
    set: (key, val) => operation(MODE_RW, store => wrap(store.put(val, key))),
    get: key => operation(MODE_RO, store => wrap(store.get(key))),
    remove: key => operation(MODE_RW, store => wrap(store.delete(key))),
    clear: () => operation(MODE_RW, store => wrap(store.clear())),
    keys: () => operation(MODE_RO, store => wrap(store.getAllKeys())),
    values: () => operation(MODE_RO, store => wrap(store.getAll())),
    entries: filter => walk(filter),
    paginate: (limit, start, dir, filter) => {
      let range = start;
      if (start != null && !(typeof IDBKeyRange !== 'undefined' && start instanceof IDBKeyRange)) {
        range = (dir || '').startsWith(DIR_PREV) ? IDBKeyRange.upperBound(start) : IDBKeyRange.lowerBound(start);
      }
      return walk(filter, limit, range, dir, 1);
    },
    count: () => operation(MODE_RO, store => wrap(store.count())),
    has: key => operation(MODE_RO, async store => !!(await wrap(store.count(key)))),
    raw: (cb, mode = MODE_RO) => operation(mode, cb),
    update,
    push: (key, val) => update(key, (cur = []) => [...(Array.isArray(cur) ? cur : []), val]),
    merge: (key, obj) => isObject(obj) ? update(key, cur => ({ ...(isObject(cur) ? cur : {}), ...obj })) : Promise.reject(new TypeError('merge patch must be a non-null object'))
  };

  ['get', 'set', 'remove'].forEach(n => api[n + 'Item'] = api[n]);

  instances.set(key, api);
  return api;
};

export const tinyIDB = getAPI();
export default tinyIDB;
