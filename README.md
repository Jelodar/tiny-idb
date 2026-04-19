# tiny-idb

**A tiny IndexedDB wrapper for simple key/value persistence.**

`tiny-idb` is the small, async alternative to `localStorage` when you want IndexedDB durability without taking on IndexedDB ceremony. It stays intentionally narrow:

- automatic multi-store support within a single database
- promise-based reads and writes
- atomic read-modify-write helpers
- cursor-based iteration with filtering and pagination
- `raw()` for native IndexedDB escape hatches

[![NPM Version](https://img.shields.io/npm/v/tiny-idb.svg)](https://www.npmjs.com/package/tiny-idb)
[![License](https://img.shields.io/npm/l/tiny-idb.svg)](LICENSE)
[![Size](https://img.shields.io/bundlephobia/minzip/tiny-idb)](https://bundlephobia.com/package/tiny-idb)

## Why tiny-idb?

- **Tiny footprint.** The minified bundle is about 1KB gzipped.
- **Async API.** No synchronous main-thread storage calls.
- **Atomic helpers.** `update()`, `push()`, and `merge()` run inside one IndexedDB transaction, avoiding race conditions.
- **Automatic batching.** Calls made in the same microtask are pipelined into one transaction by default for massive performance gains.
- **Efficient iteration.** Memory-friendly cursor-based scans for entries and pagination.

### How it compares

| Feature | `localStorage` | `idb-keyval` | `localForage` | `Dexie` | `tiny-idb` |
|---------|:---:|:---:|:---:|:---:|:---:|
| Size | N/A | ~1KB | ~10KB | ~30KB | **~1KB** |
| Async | ❌ | ✅ | ✅ | ✅ | ✅ |
| Atomic Updates | ❌ | ❌ | ❌ | ✅ | ✅ |
| Auto-Batching | ❌ | ❌ | ❌ | ❌ | ✅ |
| Pagination | ❌ | ❌ | ❌ | ✅ | ✅ |
| Multi-Store | ❌ | ✅ | ✅ | ✅ | ✅ |

## Installation

```bash
npm install tiny-idb
```

### Running Tests
```bash
npm test
```

### Building & Minification
```bash
npm run build
```

## API

### Methods

| Method | Description |
|--------|-------------|
| `open(dbName, storeName?, batching?)` | Creates or retrieves a cached instance. `storeName` defaults to `dbName`. `batching` (default `true`) pipelines calls in the same microtask. |
| `open(dbName, batching)` | Shorthand for `open(dbName, dbName, batching)`. |
| `get(key)` | Returns the value for `key`, or `undefined`. |
| `set(key, value)` | Stores `value` at `key`. |
| `remove(key)` | Deletes `key`. |
| `clear()` | Removes every entry in the store. |
| `keys()` | Returns all keys. |
| `values()` | Returns all values. |
| `entries(filter?)` | Returns `[key, value]` pairs. `filter` is called with `(value, key)`. |
| `paginate(limit, start?, dir?, filter?)` | Returns `{ items, next }` for paginated scans. |
| `count()` | Returns the number of entries. |
| `has(key)` | Returns true if `key` exists. |
| `raw(cb, mode?)` | Runs `cb` with the native `IDBObjectStore`. |
| `update(key, fn)` | Atomically replaces a value using `fn(currentValue)`. |
| `push(key, value)` | Atomically appends `value` to an array. |
| `merge(key, patch)` | Atomically shallow-merges a non-null object patch. |
| `getItem(key)` | Alias for `get(key)`. |
| `setItem(key, value)` | Alias for `set(key, value)`. |
| `removeItem(key)` | Alias for `remove(key)`. |

### Constants

Available as named exports or on the `db` instance.

| Constant | Value | Description |
|----------|-------|-------------|
| `MODE_RO` | `'readonly'` | Default mode for `raw()`. |
| `MODE_RW` | `'readwrite'` | Read-write mode for `raw()`. |
| `DIR_NEXT` | `'next'` | Forward direction for `paginate()`. |
| `DIR_PREV` | `'prev'` | Reverse direction for `paginate()`. |

## Guarantees

- `set`, `remove`, `clear`, `update`, `push`, and `merge` run inside IndexedDB transactions.
- `update`, `push`, and `merge` avoid the usual read-modify-write race.
- Batched calls in the same microtask share one transaction unless batching is disabled.
- `merge()` rejects invalid patches instead of coercing them.
- Callbacks passed to `update()` and `raw()` must stay within the transaction lifetime.

## Browser Support

Supported by virtually all browsers in use today (99%+ market share). Since [May 2018](https://caniuse.com/es6-module), this feature works across the latest devices and major browser versions:
- **Chrome** 71+
- **Firefox** 69+
- **Safari** 12.1+
- **Edge** 79+

## Development

`tiny-idb` is written in pure vanilla JavaScript. No compilation is required for development.

## Usage

You can use either the default export or the named `tinyIDB` export. They are identical:

```js
import db from 'tiny-idb';
// OR
import { tinyIDB as db } from 'tiny-idb';
```

### localStorage-style calls

```js
await db.setItem('session_id', 'xyz-123');
const sessionId = await db.getItem('session_id');
await db.removeItem('session_id');
```

### Custom database and multi-store

```js
// Separate databases (store name defaults to db name)
const settings = db.open('app-settings');

// Disable automatic microtask batching
const noBatch = db.open('my-db', false);

// Multiple stores in the same database
const users = db.open('my-app', 'users');
const logs = db.open('my-app', 'logs');

await settings.set('theme', 'dark');
await users.set(42, { name: 'Alice' });
await logs.push('recent', 'User 42 logged in');
```

### Atomic counter

```js
await db.set('page_views', 0);
await db.update('page_views', (count) => (count || 0) + 1);
```

### Atomic array append

```js
await db.push('cart', { id: 101, qty: 1 });
await db.push('cart', { id: 202, qty: 2 });
```

### Atomic object merge

```js
await db.set('settings', { theme: 'dark', notifications: true });
await db.merge('settings', { notifications: false, language: 'en' });
```

### Automatic Batching (Performance)

One of the most powerful features of `tiny-idb` is its automatic transaction pipelining. IndexedDB transactions are expensive to open. `tiny-idb` caches calls made in the same microtask (tick) and executes them in a single transaction.

```js
// These 3 calls happen in the same tick.
// tiny-idb automatically combines them into ONE 'readwrite' transaction.
// This is 10x-100x faster than 3 separate transactions.
db.set('user', 'alice');
db.set('theme', 'dark');
db.set('notifications', true);

// You can wait for all at once
await Promise.all([ /* ... promises from above ... */ ]);
```

### TypeScript Support

`tiny-idb` comes with full TypeScript definitions. You can use generics to type your retrieved data:

```ts
interface User {
  name: string;
  age: number;
}

// Typing a single retrieval
const user = await db.get<User>('user:1');

// Typing iteration
const users = await db.entries<string, User>();
// users is [string, User][]

// Typing pagination
const page = await db.paginate<string, User>(10);
// page.items is [string, User][]
```

### Binary data

```js
const blob = await (await fetch('/profile.jpg')).blob();
await db.set('user_avatar', blob);
```

### Filtered Iteration

```js
// Scans and returns only users over 18
const isAdult = (user) => user.age >= 18;
const adults = await db.entries(isAdult);

// Scans only keys with a specific prefix
const isLog = (val, key) => key.startsWith('log:');
const logs = await db.entries(isLog);
```

### Pagination

```js
import db from 'tiny-idb';

// 1. Fetch first 10 items
const page1 = await db.paginate(10);
console.log(page1.items); // [[key1, val1], [key2, val2], ...]

// 2. Fetch next 10 items starting from where we left off
// Tip: 'next' is the exact key to start the next page with (no duplicates).
if (page1.next) {
  const page2 = await db.paginate(10, page1.next);
}

// 3. Reverse pagination (fetch 10 newest items)
const { items: latest } = await db.paginate(10, null, db.DIR_PREV);

// 4. Pagination with a filter and direction
// Define filter separately for readability (e.g. items over $120)
const isExpensive = (item) => item.price > 120;
const { items: premiumItems } = await db.paginate(10, null, db.DIR_PREV, isExpensive);
```

## `update()` and `raw()` callback rules

The callback must finish while the transaction is still alive.

Safe:
- Synchronous logic.
- Microtask-only async such as `Promise.resolve(...)`.
- Returning an IndexedDB request promise (e.g. from `store.get()` or `store.put()`).

Unsafe:
- `setTimeout` or `setInterval`.
- Network requests (fetch).
- Long `await` chains unrelated to the current transaction.

## Recipes

### Prefix scan

```js
import { tinyIDB as db } from 'tiny-idb';

const todos = await db.raw((store) => new Promise((resolve, reject) => {
  const range = IDBKeyRange.bound('todo:', 'todo:\uffff');
  const req = store.openCursor(range);
  const matches = [];
  req.onsuccess = () => {
    const cursor = req.result;
    if (!cursor) return resolve(matches);
    matches.push([cursor.key, cursor.value]);
    cursor.continue();
  };
}));
```

### Custom Key Range

```js
import { tinyIDB as db } from 'tiny-idb';

// Paginate only within a specific key range
// Accepts both a starting key or a full IDBKeyRange
const range = IDBKeyRange.bound('user:a', 'user:f');
const { items } = await db.paginate(20, range);
```

### Direct Write with raw()

```js
import { tinyIDB as db } from 'tiny-idb';

// Direct write without manual promise wrapping. 
// raw() resolves only after the transaction completes.
await db.raw((store) => store.put('value', 'key'), db.MODE_RW);
```

## License

MIT © [Jelodar](https://github.com/Jelodar)
