import 'fake-indexeddb/auto';
import assert from 'node:assert';
import { test } from 'node:test';

const { tinyIDB } = await import(process.env.TEST_MIN ? './tiny-idb.min.js' : './tiny-idb.js');

test('tiny-idb basic operations', async (t) => {
  await t.test('set and get', async () => {
    await tinyIDB.set('foo', 'bar');
    const val = await tinyIDB.get('foo');
    assert.strictEqual(val, 'bar');
  });

  await t.test('setItem and getItem aliases', async () => {
    await tinyIDB.setItem('alias', 'value');
    const val = await tinyIDB.getItem('alias');
    assert.strictEqual(val, 'value');
  });

  await t.test('get non-existent key', async () => {
    const val = await tinyIDB.get('non-existent');
    assert.strictEqual(val, undefined);
  });

  await t.test('remove key', async () => {
    await tinyIDB.set('to-delete', 123);
    await tinyIDB.remove('to-delete');
    const val = await tinyIDB.get('to-delete');
    assert.strictEqual(val, undefined);
  });

  await t.test('removeItem alias', async () => {
    await tinyIDB.set('to-delete-alias', 456);
    await tinyIDB.removeItem('to-delete-alias');
    const val = await tinyIDB.get('to-delete-alias');
    assert.strictEqual(val, undefined);
  });

  await t.test('clear all data', async () => {
    await tinyIDB.set('a', 1);
    await tinyIDB.set('b', 2);
    await tinyIDB.clear();
    const count = await tinyIDB.count();
    assert.strictEqual(count, 0);
    assert.strictEqual(await tinyIDB.get('a'), undefined);
  });

  await t.test('list all keys and values', async () => {
    await tinyIDB.clear();
    await tinyIDB.set('k1', 'v1');
    await tinyIDB.set('k2', 'v2');
    const keys = await tinyIDB.keys();
    const values = await tinyIDB.values();
    assert.deepStrictEqual(keys.sort(), ['k1', 'k2']);
    assert.deepStrictEqual(values.sort(), ['v1', 'v2']);
  });

  await t.test('count entries', async () => {
    await tinyIDB.clear();
    await tinyIDB.set('c1', 1);
    await tinyIDB.set('c2', 2);
    const count = await tinyIDB.count();
    assert.strictEqual(count, 2);
  });

  await t.test('has key', async () => {
    await tinyIDB.clear();
    await tinyIDB.set('h1', 1);
    assert.strictEqual(await tinyIDB.has('h1'), true);
    assert.strictEqual(await tinyIDB.has('h2'), false);
  });

  await t.test('atomic update', async () => {
    await tinyIDB.set('count', 10);
    await tinyIDB.update('count', (c) => c + 5);
    const val = await tinyIDB.get('count');
    assert.strictEqual(val, 15);
  });

  await t.test('push to array', async () => {
    await tinyIDB.remove('list');
    await tinyIDB.push('list', 'item1');
    await tinyIDB.push('list', 'item2');
    const list = await tinyIDB.get('list');
    assert.deepStrictEqual(list, ['item1', 'item2']);
  });

  await t.test('push to non-array (should initialize to array)', async () => {
    await tinyIDB.set('not-array', 'string');
    await tinyIDB.push('not-array', 'item');
    const list = await tinyIDB.get('not-array');
    assert.deepStrictEqual(list, ['item']);
  });

  await t.test('shallow merge object', async () => {
    await tinyIDB.set('user', { name: 'Alice' });
    await tinyIDB.merge('user', { age: 30 });
    const user = await tinyIDB.get('user');
    assert.deepStrictEqual(user, { name: 'Alice', age: 30 });
  });

  await t.test('merge into non-object (should initialize to object)', async () => {
    await tinyIDB.set('not-obj', 123);
    await tinyIDB.merge('not-obj', { a: 1 });
    const obj = await tinyIDB.get('not-obj');
    assert.deepStrictEqual(obj, { a: 1 });
  });

  await t.test('merge with null current value', async () => {
    await tinyIDB.remove('null-key');
    await tinyIDB.merge('null-key', { a: 1 });
    const obj = await tinyIDB.get('null-key');
    assert.deepStrictEqual(obj, { a: 1 });
  });

  await t.test('update non-existent key', async () => {
    await tinyIDB.remove('new-count');
    await tinyIDB.update('new-count', (c) => (c || 0) + 1);
    const val = await tinyIDB.get('new-count');
    assert.strictEqual(val, 1);
  });

  await t.test('error handling in transaction', async () => {
    let errorCaught = false;
    try {
      await tinyIDB.update('some-key', () => { throw new Error('Update failed'); });
    } catch (e) {
      assert.strictEqual(e.message, 'Update failed');
      errorCaught = true;
    }
    assert.strictEqual(errorCaught, true);
  });

  await t.test('remove non-existent key', async () => {
    await tinyIDB.remove('non-existent');
    const val = await tinyIDB.get('non-existent');
    assert.strictEqual(val, undefined);
  });

  await t.test('open method exists', async () => {
    assert.strictEqual(typeof tinyIDB.open, 'function');
  });

  await t.test('open returns a separate instance', async () => {
    const db2 = tinyIDB.open('db-two', 'store2');
    assert.notStrictEqual(tinyIDB, db2);
    assert.strictEqual(typeof db2.set, 'function');
  });

  await t.test('multiple instances do not interfere', async () => {
    const dbA = tinyIDB.open('db-A', 'sA');
    const dbB = tinyIDB.open('db-B', 'sB');
    
    await dbA.set('key', 'valueA');
    await dbB.set('key', 'valueB');
    
    assert.strictEqual(await dbA.get('key'), 'valueA');
    assert.strictEqual(await dbB.get('key'), 'valueB');
  });

  await t.test('same database can add a second store later', async () => {
    const settings = tinyIDB.open('multi-store-db', 'settings');
    const cache = tinyIDB.open('multi-store-db', 'cache');

    await settings.set('theme', 'dark');
    await cache.set('temp_data', { id: 1 });
    
    assert.strictEqual(await settings.get('theme'), 'dark');
    assert.deepStrictEqual(await cache.get('temp_data'), { id: 1 });
  });

  await t.test('open returns same instance for same names', async () => {
    const db1 = tinyIDB.open('same-db', 'same-s');
    const db2 = tinyIDB.open('same-db', 'same-s');
    assert.strictEqual(db1, db2);
  });

  await t.test('open defaults storeName to dbName', async () => {
    const db = tinyIDB.open('only-db');
    await db.set('x', 1);
    const sameDb = tinyIDB.open('only-db', 'only-db');
    assert.strictEqual(await sameDb.get('x'), 1);
    assert.strictEqual(db, sameDb);
  });

  await t.test('transaction error propagation', async () => {
    const db = tinyIDB.open('fail-db', 'fail-store');
    try {
      await db.update('k', async (val) => {
        throw new Error('Abort manually');
      });
    } catch (e) {
      assert.strictEqual(e.message, 'Abort manually');
    }
  });

  await t.test('collision check for instance keys', async () => {
    const db1 = tinyIDB.open('a', 'bc');
    const db2 = tinyIDB.open('ab', 'c');
    assert.notStrictEqual(db1, db2, 'Instances with different DB/Store names should not collide');
  });

  await t.test('set invalid data (Symbol) should fail', async () => {
    try {
      await tinyIDB.set('sym', Symbol('fail'));
      assert.fail('Should have thrown DataCloneError');
    } catch (e) {
      assert.ok(e.name === 'DataCloneError' || e.message.includes('clone'));
    }
  });

  await t.test('update atomicity on failure', async () => {
    await tinyIDB.set('atomic', 'initial');
    try {
      await tinyIDB.update('atomic', () => {
        throw new Error('Crashed');
      });
    } catch (e) {
      assert.strictEqual(e.message, 'Crashed');
    }
    const val = await tinyIDB.get('atomic');
    assert.strictEqual(val, 'initial', 'Value should not have changed if update failed');
  });

  await t.test('push atomicity on failure', async () => {
    await tinyIDB.set('list-fail', 'string');
    await tinyIDB.push('list-fail', 1);
    const val = await tinyIDB.get('list-fail');
    assert.deepStrictEqual(val, [1]);
  });

  await t.test('merge into null', async () => {
    await tinyIDB.remove('null-merge');
    await tinyIDB.set('null-merge', null);
    await tinyIDB.merge('null-merge', { a: 1 });
    const val = await tinyIDB.get('null-merge');
    assert.deepStrictEqual(val, { a: 1 });
  });

  await t.test('merge into non-object primitive', async () => {
    await tinyIDB.set('prim', 123);
    await tinyIDB.merge('prim', { a: 1 });
    const val = await tinyIDB.get('prim');
    assert.deepStrictEqual(val, { a: 1 });
  });

  await t.test('merge with non-object patch should fail', async () => {
    await tinyIDB.set('m', { a: 1 });
    await assert.rejects(
      tinyIDB.merge('m', 'not-an-object'),
      (e) => e instanceof TypeError && e.message === 'merge patch must be a non-null object'
    );
    assert.deepStrictEqual(await tinyIDB.get('m'), { a: 1 });
  });

  await t.test('push with undefined initial', async () => {
    const db = tinyIDB.open('new-db-push');
    await db.push('list', 1);
    assert.deepStrictEqual(await db.get('list'), [1]);
  });
  
  await t.test('list all entries', async () => {
    await tinyIDB.clear();
    await tinyIDB.set('k1', 'v1');
    await tinyIDB.set('k2', 'v2');
    const entries = await tinyIDB.entries();
    assert.deepStrictEqual(entries.sort(), [['k1', 'v1'], ['k2', 'v2']]);
  });

  await t.test('microtask update function (Promise.resolve)', async () => {
    await tinyIDB.set('micro-key', 1);
    await tinyIDB.update('micro-key', async (val) => {
      return Promise.resolve(val + 1);
    });
    assert.strictEqual(await tinyIDB.get('micro-key'), 2);
  });

  await t.test('update rejects when callback crosses a task boundary', async () => {
    const db = tinyIDB.open('update-async-boundary');
    await db.set('k', 1);
    await assert.rejects(
      db.update('k', async (val) => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        return val + 1;
      }),
      (e) => e?.name === 'TransactionInactiveError'
    );
    assert.strictEqual(await db.get('k'), 1);
  });

  await t.test('onversionchange handling', async () => {
    const db = tinyIDB.open('version-db');
    await db.set('x', 1);
    
    const rawDb = await new Promise((resolve) => {
      const req = indexedDB.open('version-db', 1);
      req.onsuccess = () => resolve(req.result);
    });
    
    if (typeof rawDb.onversionchange === 'function' || rawDb.onversionchange === null) {
        rawDb.onversionchange({ type: 'versionchange' }); 
    }
    
    await db.set('x', 2);
    assert.strictEqual(await db.get('x'), 2);
    rawDb.close();
  });

  await t.test('transaction onabort manual trigger', async () => {
    const db = tinyIDB.open('abort-db');
    try {
      await db.update('k', (s) => {
        throw new Error('Trigger abort');
      });
    } catch (e) {
      assert.strictEqual(e.message, 'Trigger abort');
    }
  });

  await t.test('stress test sequential atomic updates', async () => {
    const db = tinyIDB.open('stress-db');
    await db.set('count', 0);
    for (let i = 0; i < 20; i++) {
        await db.update('count', c => (c || 0) + 1);
    }
    assert.strictEqual(await db.get('count'), 20);
  });

  await t.test('raw method for direct cursor search', async () => {
    const db = tinyIDB.open('raw-search');
    await db.clear();
    await db.set('p1', { type: 'fruit', name: 'apple' });
    await db.set('p2', { type: 'vegetable', name: 'carrot' });
    await db.set('p3', { type: 'fruit', name: 'banana' });

    const fruits = await db.raw(store => {
        return new Promise((resolve) => {
            const matches = [];
            const req = store.openCursor();
            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    if (cursor.value.type === 'fruit') matches.push(cursor.value.name);
                    cursor.continue();
                } else resolve(matches);
            };
        });
    });

    assert.deepStrictEqual(fruits.sort(), ['apple', 'banana']);
  });

  await t.test('raw method with readwrite mode', async () => {
    const db = tinyIDB.open('raw-rw');
    await db.raw(store => {
        store.put('direct', 'key');
    }, 'readwrite');
    assert.strictEqual(await db.get('key'), 'direct');
  });
  
  await t.test('getDB error handling', async () => {
    const originalOpen = indexedDB.open;
    indexedDB.open = () => {
      const req = { onerror: null, onsuccess: null };
      setTimeout(() => {
        req.error = new Error('Open failed');
        req.onerror();
      }, 0);
      return req;
    };
    try {
      const dbFail = tinyIDB.open('fail-open');
      await dbFail.get('any');
      assert.fail('Should have thrown');
    } catch (e) {
      assert.strictEqual(e.message, 'Open failed');
    } finally {
      indexedDB.open = originalOpen;
    }
  });

  await t.test('concurrent batching performance and atomicity', async () => {
    const db = tinyIDB.open('batch-db');
    await db.clear();
    
    const p1 = db.set('a', 1);
    const p2 = db.set('b', 2);
    const p3 = db.set('c', 3);
    
    await Promise.all([p1, p2, p3]);
    
    assert.strictEqual(await db.get('a'), 1);
    assert.strictEqual(await db.get('b'), 2);
    assert.strictEqual(await db.get('c'), 3);
  });

  await t.test('batch failure (fail-together)', async () => {
    const db = tinyIDB.open('batch-fail-db');
    await db.clear();
    
    const p1 = db.set('a', 1);
    const p2 = db.set('b', Symbol('fail'));
    const p3 = db.set('c', 3);
    
    try {
      await Promise.all([p1, p2, p3]);
      assert.fail('Should have failed the entire batch');
    } catch (e) {
      assert.ok(e.name === 'DataCloneError' || e.message.includes('clone'));
    }
    
    assert.strictEqual(await db.get('a'), undefined);
    assert.strictEqual(await db.get('c'), undefined);
  });

  await t.test('constants are exposed', async () => {
    assert.strictEqual(tinyIDB.MODE_RO, 'readonly');
    assert.strictEqual(tinyIDB.MODE_RW, 'readwrite');
    assert.strictEqual(tinyIDB.DIR_NEXT, 'next');
    assert.strictEqual(tinyIDB.DIR_PREV, 'prev');

    const db2 = tinyIDB.open('other');
    assert.strictEqual(db2.MODE_RO, 'readonly');
    assert.strictEqual(db2.MODE_RW, 'readwrite');
  });

  await t.test('mixed mode batching (RO+RW escalation)', async () => {
    const db = tinyIDB.open('mixed-batch');
    await db.set('initial', 'value');
    
    const p1 = db.get('initial');
    const p2 = db.set('new', 'data');
    
    const [val1] = await Promise.all([p1, p2]);
    assert.strictEqual(val1, 'value');
    assert.strictEqual(await db.get('new'), 'data');
  });

  await t.test('disabled batching (independent failures)', async () => {
    const db = tinyIDB.open('no-batch-db', false);
    await db.clear();
    
    const p1 = db.set('a', 1);
    const p2 = db.set('b', Symbol('fail'));
    const p3 = db.set('c', 3);
    
    const results = await Promise.allSettled([p1, p2, p3]);
    
    assert.strictEqual(results[0].status, 'fulfilled');
    assert.strictEqual(results[1].status, 'rejected');
    assert.strictEqual(results[2].status, 'fulfilled');
    
    assert.strictEqual(await db.get('a'), 1);
    assert.strictEqual(await db.get('c'), 3);
  });

  // ENRICHED TESTS FOR 100% COVERAGE
  await t.test('rapid fire open calls', async () => {
    const db1 = tinyIDB.open('rapid');
    const db2 = tinyIDB.open('rapid');
    const db3 = tinyIDB.open('rapid');
    assert.strictEqual(db1, db2);
    assert.strictEqual(db2, db3);
  });

  await t.test('open shorthand (dbName, batching)', async () => {
    const db1 = tinyIDB.open('short', false);
    const db2 = tinyIDB.open('short', 'short', false);
    assert.strictEqual(db1, db2);
    
    const db3 = tinyIDB.open('short', true);
    assert.strictEqual(db1, db3);
  });

  await t.test('reopen after connection change', async () => {
    const db = tinyIDB.open('reopen-db');
    await db.set('k', 1);
    
    // Trigger onversionchange
    const rawReq = indexedDB.open('reopen-db', 1);
    rawReq.onsuccess = () => {
        rawReq.result.onversionchange({ type: 'versionchange' });
        rawReq.result.close();
    };
    
    // The next operation should trigger a fresh connection
    await db.set('k', 2);
    assert.strictEqual(await db.get('k'), 2);
  });

  await t.test('concurrent read batches', async () => {
    const db = tinyIDB.open('read-concurrent');
    await db.set('x', 1);
    const p1 = db.get('x');
    const p2 = db.get('x');
    const [v1, v2] = await Promise.all([p1, p2]);
    assert.strictEqual(v1, 1);
    assert.strictEqual(v2, 1);
  });

  await t.test('raw method with error', async () => {
    const db = tinyIDB.open('raw-err');
    try {
        await db.raw(() => { throw new Error('Raw fail'); });
        assert.fail();
    } catch (e) {
        assert.strictEqual(e.message, 'Raw fail');
    }
  });

  await t.test('update with undefined value', async () => {
    const db = tinyIDB.open('up-undef');
    await db.update('none', (v) => {
        assert.strictEqual(v, undefined);
        return 'new';
    });
    assert.strictEqual(await db.get('none'), 'new');
  });

  await t.test('merge non-object input', async () => {
    const db = tinyIDB.open('merge-non');
    await db.set('k', { a: 1 });
    await assert.rejects(
      db.merge('k', null),
      (e) => e instanceof TypeError && e.message === 'merge patch must be a non-null object'
    );
    assert.deepStrictEqual(await db.get('k'), { a: 1 });
  });

  await t.test('entries on empty store', async () => {
    const db = tinyIDB.open('empty-store');
    await db.clear();
    const entries = await db.entries();
    assert.deepStrictEqual(entries, []);
  });

  await t.test('concurrent store creation in same DB', async () => {
    const dbName = 'concurrent-db';
    // Start two opens simultaneously
    const db1 = tinyIDB.open(dbName, 'store1');
    const db2 = tinyIDB.open(dbName, 'store2');
    
    // Perform operations simultaneously
    await Promise.all([
      db1.set('a', 1),
      db2.set('b', 2)
    ]);
    
    assert.strictEqual(await db1.get('a'), 1);
    assert.strictEqual(await db2.get('b'), 2);
  });

  await t.test('transaction aborted externally', async () => {
    const db = tinyIDB.open('external-abort');
    await db.set('k', 1);
    try {
      await db.raw((store) => {
        store.transaction.abort();
      });
      assert.fail('Should have thrown Aborted');
    } catch (e) {
      assert.ok(e.message.includes('Abort') || e.name === 'AbortError');
    }
  });

  await t.test('raw method with invalid mode', async () => {
    const db = tinyIDB.open('invalid-mode');
    try {
      await db.raw(() => {}, 'invalid');
      assert.fail('Should have failed due to invalid IDB mode');
    } catch (e) {
      // Log for debugging
      // console.log('Invalid mode error:', e);
      assert.ok(e instanceof TypeError || e.name === 'TypeError' || e.name === 'InvalidStateError' || e.message.includes('mode'));
    }
  });

  await t.test('open with swapped arguments validation', async () => {
    const db1 = tinyIDB.open('swapped', false); // db, batching
    const db2 = tinyIDB.open('swapped', 'swapped', false); // db, store, batching
    assert.strictEqual(db1, db2);
  });

  await t.test('consecutive flushes with different modes', async () => {
    const db = tinyIDB.open('modes-db');
    const p1 = db.get('x'); // RO
    const p2 = db.set('x', 1); // RW
    const p3 = db.get('x'); // RO
    
    // All should be batched into one RW transaction
    await Promise.all([p1, p2, p3]);
    assert.strictEqual(await db.get('x'), 1);
  });

  await t.test('entries with filter function', async () => {
    const db = tinyIDB.open('filter-db');
    await db.clear();
    await db.set(1, { age: 20 });
    await db.set(2, { age: 30 });
    await db.set(3, { age: 40 });
    
    const adults = await db.entries((v) => v.age >= 30);
    assert.strictEqual(adults.length, 2);
    assert.deepStrictEqual(adults[0], [2, { age: 30 }]);
    assert.deepStrictEqual(adults[1], [3, { age: 40 }]);
  });

  await t.test('entries filter with key', async () => {
    const db = tinyIDB.open('filter-key-db');
    await db.clear();
    await db.set('user:1', 'a');
    await db.set('user:2', 'b');
    await db.set('admin:1', 'c');
    
    const users = await db.entries((v, k) => k.startsWith('user:'));
    assert.strictEqual(users.length, 2);
    assert.deepStrictEqual(users[0], ['user:1', 'a']);
  });

  await t.test('paginate basic functionality', async () => {
    const db = tinyIDB.open('page-db');
    await db.clear();
    for (let i = 1; i <= 5; i++) await db.set(i, `val${i}`);
    
    const page1 = await db.paginate(2);
    assert.strictEqual(page1.items.length, 2);
    assert.deepStrictEqual(page1.items[0], [1, 'val1']);
    assert.strictEqual(page1.next, 3);
    
    const page2 = await db.paginate(2, page1.next);
    assert.strictEqual(page2.items.length, 2);
    assert.deepStrictEqual(page2.items[0], [3, 'val3']);
    assert.strictEqual(page2.next, 5);
  });

  await t.test('paginate with filter and direction', async () => {
    const db = tinyIDB.open('page-dir-db');
    await db.clear();
    await db.set(1, { price: 50 });
    await db.set(2, { price: 150 });
    await db.set(3, { price: 200 });
    await db.set(4, { price: 300 });
    await db.set(5, { price: 80 });
    
    const isPremium = (item) => item.price > 120;
    const page = await db.paginate(10, null, 'prev', isPremium);
    assert.strictEqual(page.items.length, 3);
    assert.deepStrictEqual(page.items[0], [4, { price: 300 }]);
    assert.deepStrictEqual(page.items[1], [3, { price: 200 }]);
    assert.deepStrictEqual(page.items[2], [2, { price: 150 }]);
    assert.strictEqual(page.next, null);
  });

  await t.test('paginate with direction as 3rd arg', async () => {
    const db = tinyIDB.open('page-flex-db');
    await db.clear();
    for (let i = 1; i <= 3; i++) await db.set(i, i);
    
    // Test dir as 3rd arg: paginate(limit, start, dir)
    const page = await db.paginate(10, null, 'prev');
    assert.strictEqual(page.items.length, 3);
    assert.deepStrictEqual(page.items[0], [3, 3]);
    assert.deepStrictEqual(page.items[2], [1, 1]);
  });

  await t.test('paginate with Date keys', async () => {
    const db = tinyIDB.open('page-date-db');
    await db.clear();
    const d1 = new Date(2023, 0, 1);
    const d2 = new Date(2023, 0, 2);
    const d3 = new Date(2023, 0, 3);
    await db.set(d1, 'v1');
    await db.set(d2, 'v2');
    await db.set(d3, 'v3');

    const page1 = await db.paginate(2, d1);
    assert.strictEqual(page1.items.length, 2);
    assert.deepStrictEqual(page1.items[0], [d1, 'v1']);
    assert.deepStrictEqual(page1.items[1], [d2, 'v2']);
    assert.deepStrictEqual(page1.next, d3);
  });

  await t.test('batch atomicity: individual promises should not resolve falsely', async () => {
    const db = tinyIDB.open('batch-atomicity-rigorous');
    await db.clear();

    let p1Resolved = false;
    const p1 = db.set('a', 1).then(() => {
      p1Resolved = true;
    });

    // Cause a failure in the same batch
    const p2 = db.set('b', Symbol('fail'));

    try {
      await Promise.all([p1, p2]);
    } catch (e) {
      // Expected failure
    }

    assert.strictEqual(p1Resolved, false, 'p1 should NOT have resolved because the batch failed');
    assert.strictEqual(await db.get('a'), undefined, 'a should not be in DB');
  });

  await t.test('paginate: inclusivity check', async () => {
    const db = tinyIDB.open('page-inc');
    await db.clear();
    await db.set(1, 'a');
    await db.set(2, 'b');
    await db.set(3, 'c');

    // Starting at 2 should include 2
    const page = await db.paginate(10, 2);
    assert.strictEqual(page.items[0][0], 2);
    assert.strictEqual(page.items.length, 2);
  });

  await t.test('paginate: always returns object even if limit is null', async () => {
    const db = tinyIDB.open('page-object');
    await db.clear();
    await db.set(1, 'a');
    
    const result = await db.paginate(null);
    assert.ok(!Array.isArray(result));
    assert.strictEqual(typeof result, 'object');
    assert.deepStrictEqual(result.items, [[1, 'a']]);
    assert.strictEqual(result.next, null);
    
    const reverse = await db.paginate(null, null, 'prev');
    assert.ok(!Array.isArray(reverse));
    assert.deepStrictEqual(reverse.items, [[1, 'a']]);
  });

  await t.test('paginate: avoid duplication between pages', async () => {
    const db = tinyIDB.open('page-dupe-check');
    await db.clear();
    for (let i = 1; i <= 5; i++) await db.set(i, i);
    
    // Page 1: [1, 2], next: 3
    const page1 = await db.paginate(2);
    assert.deepStrictEqual(page1.items.map(i => i[0]), [1, 2]);
    assert.strictEqual(page1.next, 3);
    
    // Page 2: [3, 4], next: 5
    const page2 = await db.paginate(2, page1.next);
    assert.deepStrictEqual(page2.items.map(i => i[0]), [3, 4]);
    assert.strictEqual(page2.next, 5);
    
    // Page 3: [5], next: null
    const page3 = await db.paginate(2, page2.next);
    assert.deepStrictEqual(page3.items.map(i => i[0]), [5]);
    assert.strictEqual(page3.next, null);
  });
});




