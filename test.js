import 'fake-indexeddb/auto';
import { tinyIDB } from './tiny-idb.js';
import assert from 'node:assert';
import { test } from 'node:test';

test('tiny-idb basic operations', async (t) => {
  await t.test('set and get', async () => {
    await tinyIDB.set('foo', 'bar');
    const val = await tinyIDB.get('foo');
    assert.strictEqual(val, 'bar');
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

  await t.test('shallow merge object', async () => {
    await tinyIDB.set('user', { name: 'Alice' });
    await tinyIDB.merge('user', { age: 30 });
    const user = await tinyIDB.get('user');
    assert.deepStrictEqual(user, { name: 'Alice', age: 30 });
  });
});
