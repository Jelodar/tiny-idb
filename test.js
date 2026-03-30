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
    // Note: the implementation says: c => [...(Array.isArray(c) ? c : []), value]
    // So even if it was a string, it will be discarded and replaced with [value]
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
    try {
      await tinyIDB.update('some-key', () => { throw new Error('Update failed'); });
    } catch (e) {
      assert.strictEqual(e.message, 'Update failed');
    }
  });

  await t.test('remove non-existent key', async () => {
    await tinyIDB.remove('non-existent');
    // Should not throw and should still be undefined
    const val = await tinyIDB.get('non-existent');
    assert.strictEqual(val, undefined);
  });
});
