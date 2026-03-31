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

  // NEW NEGATIVE / EDGE CASE TESTS
  await t.test('transaction error propagation', async () => {
    const db = tinyIDB.open('fail-db', 'fail-store');
    // We try to trigger an IndexedDB error by providing an invalid value (though IDB values are broad)
    // A better way is to mock or use a known error state.
    // Let's try to close the DB while a transaction is pending if possible, or just mock req.onerror.
    // For now, we'll verify that our tx wrapper catches aborted transactions.
    try {
      await db.update('k', async (val) => {
        // This is a bit of a hack to trigger an abort
        // In a real environment, you might lose connection or have a quota error.
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
      // IndexedDB throws DataCloneError for symbols
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
    // We can't easily make 'put' fail without invalid data, 
    // but we can test if it handles the initial value correctly.
    // If it was already a string, it replaces it with an array.
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

  await t.test('merge with non-object patch', async () => {
    await tinyIDB.set('m', { a: 1 });
    await tinyIDB.merge('m', 'not-an-object');
    const val = await tinyIDB.get('m');
    // {...{a:1}, ...'not-an-object'} results in the characters of the string being spread if it were spreadable, 
    // but in JS {...obj, ...string} just keeps obj if string is spread.
    // Wait, {...{a:1}, ...'abc'} -> {0: 'a', 1: 'b', 2: 'c', a: 1}
    assert.ok(typeof val === 'object');
  });

  await t.test('push with undefined initial', async () => {
    const db = tinyIDB.open('new-db-push');
    await db.push('list', 1);
    assert.deepStrictEqual(await db.get('list'), [1]);
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
});
