# tiny-idb

**A minimalist, high-performance IndexedDB wrapper for modern web applications.**

`tiny-idb` provides a non-blocking, asynchronous alternative to `localStorage`. While `localStorage` is capped at ~5-10MB and can be cleared by the browser under memory pressure, `tiny-idb` leverages IndexedDB to offer virtually unlimited storage (up to 80% of disk space) with much higher durability.

It is designed for developers who require the reliability and capacity of IndexedDB without the complexity of its native API. By focusing on a single-store, key-value architecture, it eliminates the need for database versioning and boilerplate configuration.

[![NPM Version](https://img.shields.io/npm/v/tiny-idb.svg)](https://www.npmjs.com/package/tiny-idb)
[![License](https://img.shields.io/npm/l/tiny-idb.svg)](LICENSE)
[![Size](https://img.shields.io/bundlephobia/minzip/tiny-idb)](https://bundlephobia.com/package/tiny-idb)

## Why tiny-idb?

There are many IndexedDB wrappers, but `tiny-idb` is built with a specific philosophy: **Smallest possible footprint without sacrificing data integrity.**

-   **Smaller than most icons**: At less than 1KB (gzipped), it's lighter than a 16x16 PNG.
-   **Atomic Operations**: Built-in `update`, `push`, and `merge` are ACID-compliant and race-condition safe. No more partial updates or data loss.
-   **Zero dependencies**: Built on pure vanilla JS. No external bloat.
-   **Drop-in localStorage replacement**: Use the same `getItem`, `setItem`, `removeItem` calls, but with `await`.

## Core Advantages

### Architectural Simplicity
Native IndexedDB requires managing requests, transactions, and version upgrades. `tiny-idb` abstracts these into a predictable, promise-based API. It acts as a drop-in replacement for `localStorage` logic, allowing for an immediate transition to persistent, non-blocking storage.

### Guaranteed Atomicity
The primary weakness of most storage wrappers is the "read-modify-write" race condition. If two parts of an application attempt to update the same key simultaneously, data loss often occurs. `tiny-idb` addresses this by executing `update`, `push`, and `merge` operations within a single IndexedDB transaction, ensuring that updates are processed sequentially and reliably.

### Automatic Transaction Batching (Pipelining)
`tiny-idb` automatically batches multiple operations (`set`, `get`, `update`, etc.) called in the same microtask (event loop tick) into a **single IndexedDB transaction**. This provides a **10x to 100x performance boost** for concurrent operations (like `Promise.all`) without changing any code.

### Resource Efficiency
At **less than 1KB** (gzipped), the library introduces negligible overhead to your bundle. It is dependency-free and written in modern vanilla JavaScript, ensuring high performance across all environments that support IndexedDB.

### Intelligent Lifecycle Management
The library handles database connection pooling, tab synchronization, and error recovery automatically. If a database connection is blocked by another tab or fails due to an environmental error, `tiny-idb` gracefully resets and recovers without requiring a page reload.

## Installation

```bash
npm install tiny-idb
```

### CDN Usage

```html
<script type="module">
  import { tinyIDB as db } from 'https://unpkg.com/tiny-idb/tiny-idb.min.js';
</script>
```

## API Reference

| Method | Description |
|--------|-------------|
| `open(db, store?, batch?)` | Creates or retrieves a cached instance. `batch` defaults to `true`. |
| `get(key)` | Retrieves a value; returns `undefined` if not found. |
| `set(key, value)` | Persists a value to the store. |
| `remove(key)` | Deletes a specific key. |
| `clear()` | Removes all data from the store. |
| `keys()` | Returns an array of all keys. |
| `values()` | Returns an array of all values. |
| `entries()` | Returns an array of `[key, value]` pairs. |
| `count()` | Returns the total number of entries. |
| `raw(cb, mode?)` | Provides direct access to the `IDBObjectStore`. |
| `update(key, fn)` | Performs an **atomic** read-modify-write. |
| `push(key, value)` | **Atomically** appends to an array. |
| `merge(key, patch)` | **Atomically** shallow-merges an object. |

## Examples (Easy to Advanced)

### 1. localStorage Compatibility
Use `tiny-idb` as a drop-in replacement for `localStorage`. Just add `await`.
```javascript
import { tinyIDB as db } from 'tiny-idb';

await db.setItem('session_id', 'xyz-123');
const sid = await db.getItem('session_id');
await db.removeItem('session_id');
```

### 2. Simple Custom Database
If you only need one store per database, you can omit the `storeName`.
```javascript
import { tinyIDB as db } from 'tiny-idb';

// Creates/retrieves a DB named 'my-store' with an internal store also named 'my-store'
const store = db.open('my-store');
await store.set('key', 'value');
```

### 3. Atomic Counters
Safely increment values using the `update` method.
```javascript
import { tinyIDB as db } from 'tiny-idb';

await db.set('page_views', 0);

// Increment safely - even if multiple tabs do it at once
await db.update('page_views', count => (count || 0) + 1);
```

### 4. User Settings Management (Atomic Merge)
Easily manage and update partial user preferences without worrying about race conditions.
```javascript
import { tinyIDB as db } from 'tiny-idb';

// Initial setup
await db.set('settings', { theme: 'dark', notifications: true });

// Later, merge new settings
await db.merge('settings', { notifications: false, language: 'en' });

// Result: { theme: 'dark', notifications: false, language: 'en' }
```

### 5. Persistent Shopping Cart (Atomic Push)
Atomically add items to a list, ensuring no items are lost during concurrent updates.
```javascript
import { tinyIDB as db } from 'tiny-idb';

await db.push('cart', { id: 101, qty: 1 });
await db.push('cart', { id: 202, qty: 2 });
```

### 6. Storing Binary Data (Blobs/Files)
Unlike `localStorage`, `tiny-idb` can store binary data directly.
```javascript
import { tinyIDB as db } from 'tiny-idb';

const response = await fetch('/profile-picture.jpg');
const blob = await response.blob();

await db.set('user_avatar', blob);

const avatar = await db.get('user_avatar');
document.querySelector('img').src = URL.createObjectURL(avatar);
```

### 7. Iterating over Data
Use `entries()` to process all stored key-value pairs efficiently.
```javascript
import { tinyIDB as db } from 'tiny-idb';

const allEntries = await db.entries();
for (const [key, value] of allEntries) {
  console.log(`${key}:`, value);
}
```

### 8. Multi-Instance Support
Use `open` to create isolated storage instances.
```javascript
import { tinyIDB as db } from 'tiny-idb';

const settings = db.open('app-db', 'settings');
const cache = db.open('app-db', 'cache');

await settings.set('theme', 'dark');
await cache.set('temp_data', { id: 1 });
```

### 9. Advanced: Direct IndexedDB Access (Cursors & Search)
Use `raw()` for custom searches or when working with extremely large datasets.
```javascript
import { tinyIDB as db } from 'tiny-idb';

const results = await db.raw(store => {
  return new Promise((resolve) => {
    const matches = [];
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        if (cursor.value.type === 'urgent') matches.push(cursor.value);
        cursor.continue();
      } else resolve(matches);
    };
  });
});
```

### 10. Advanced: Disabling Batching
If you need strict one-transaction-per-operation behavior (e.g., for debugging), you can disable the default batching.
```javascript
import { tinyIDB as db } from 'tiny-idb';

// Disable batching for a specific instance
const debugDB = db.open('debug-db', false); 
```

> **Optimization Note:** While `entries()` is sufficient for most apps, developers working with **extremely large datasets** (100k+ records) should use `raw()` with a cursor to minimize memory overhead.
> ```javascript
> // Memory-efficient search for a massive dataset
> const activeUser = await db.raw(store => new Promise(res => {
>   const req = store.openCursor();
>   req.onsuccess = () => {
>     const cursor = req.result;
>     if (!cursor || cursor.value.status === 'active') res(cursor?.value);
>     else cursor.continue();
>   };
> }));
> ```

## Browser Support

Supported by virtually all browsers in use today (99%+ market share). Since [May 2018](https://caniuse.com/es6-module), this feature works across the latest devices and major browser versions:
- **Chrome** 61+
- **Firefox** 60+
- **Safari** 11+
- **Edge** 16+

## Development

`tiny-idb` is written in pure vanilla JavaScript. No compilation is required for development.

### Running Tests
```bash
npm test
```

### Building & Minification
```bash
npm run build
```

## License

MIT © [Jelodar](https://github.com/Jelodar)
