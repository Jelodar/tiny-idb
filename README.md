# tiny-idb

**A minimalist, high-performance IndexedDB wrapper for modern web applications.**

`tiny-idb` provides a non-blocking, asynchronous alternative to `localStorage`. While `localStorage` is capped at ~5-10MB and can be cleared by the browser under memory pressure, `tiny-idb` leverages IndexedDB to offer virtually unlimited storage (up to 80% of disk space) with much higher durability.

It is designed for developers who require the reliability and capacity of IndexedDB without the complexity of its native API. By focusing on a single-store, key-value architecture, it eliminates the need for database versioning and boilerplate configuration.

[![NPM Version](https://img.shields.io/npm/v/tiny-idb.svg)](https://www.npmjs.com/package/tiny-idb)
[![License](https://img.shields.io/npm/l/tiny-idb.svg)](LICENSE)
[![Size](https://img.shields.io/bundlephobia/minzip/tiny-idb)](https://bundlephobia.com/package/tiny-idb)

## Core Advantages

### Architectural Simplicity
Native IndexedDB requires managing requests, transactions, and version upgrades. `tiny-idb` abstracts these into a predictable, promise-based API. It acts as a drop-in replacement for `localStorage` logic, allowing for an immediate transition to persistent, non-blocking storage.

### Guaranteed Atomicity
The primary weakness of most storage wrappers is the "read-modify-write" race condition. If two parts of an application attempt to update the same key simultaneously, data loss often occurs. `tiny-idb` addresses this by executing `update`, `push`, and `merge` operations within a single IndexedDB transaction, ensuring that updates are processed sequentially and reliably.

### Resource Efficiency
At **less than 1KB** (gzipped), the library introduces negligible overhead to your bundle. It is dependency-free and written in modern vanilla JavaScript, ensuring high performance across all environments that support IndexedDB.

### Intelligent Lifecycle Management
The library handles database connection pooling, tab synchronization, and error recovery automatically. If a database connection is blocked by another tab or fails due to an environmental error, `tiny-idb` gracefully resets and recovers without requiring a page reload.

### Zero-Configuration Portability
Beyond npm installation, `tiny-idb` is designed for maximum portability. As a single-file, dependency-free module, it can be integrated into any environment by simply dropping `tiny-idb.js` into a project directory. **No build step, compilation, or transpilation is required.** This makes it an ideal solution for rapid prototyping, legacy system upgrades, and environments where complex build pipelines are unavailable.

## Installation

```bash
npm install tiny-idb
```

### CDN Usage

```html
<script type="module">
  import { tinyIDB } from 'https://unpkg.com/tiny-idb/tiny-idb.min.js';
</script>
```

*   **Minified Module**: `https://unpkg.com/tiny-idb/tiny-idb.min.js` (less than 1KB gzipped)
*   **Source**: `https://unpkg.com/tiny-idb/tiny-idb.js`

## Technical Comparison

| Feature | localStorage | tiny-idb |
|---------|--------------|----------|
| **Execution** | Synchronous (Blocks UI) | Asynchronous (Non-blocking) |
| **Storage Limit** | ~5-10MB | Virtually unlimited (until disk is full) |
| **Data Types** | Strings only | Objects, Blobs, Arrays, Numbers |
| **Data Integrity** | Basic | ACID Compliant |
| **Race Condition Safety** | None | Atomic `update`/`push`/`merge` |

## API Reference

| Method | Description |
|--------|-------------|
| `open(db, store?)` | Creates or retrieves a cached instance. `store` defaults to `db` name. |
| `get(key)` | Retrieves a value; returns `undefined` if not found. |
| `set(key, value)` | Persists a value to the store. |
| `remove(key)` | Deletes a specific key. |
| `clear()` | Removes all data from the store. |
| `keys()` | Returns an array of all keys. |
| `values()` | Returns an array of all values. |
| `count()` | Returns the total number of entries. |
| `update(key, fn)` | Performs an atomic read-modify-write operation. |
| `push(key, value)` | Atomically appends a value to an array. |
| `merge(key, patch)` | Atomically shallow-merges an object. |

## Example Use Cases

### User Settings Management
Easily manage and update partial user preferences without worrying about race conditions.
```javascript
import { tinyIDB } from 'tiny-idb';

// Initial setup
await tinyIDB.set('settings', { theme: 'dark', notifications: true });

// Later, merge new settings
await tinyIDB.merge('settings', { notifications: false, language: 'en' });

// Result: { theme: 'dark', notifications: false, language: 'en' }
```

### Persistent Shopping Cart
Atomically add items to a list, ensuring no items are lost during concurrent updates.
```javascript
// Add items from different parts of the UI
await tinyIDB.push('cart', { id: 101, qty: 1 });
await tinyIDB.push('cart', { id: 202, qty: 2 });

const cart = await tinyIDB.get('cart');
console.log(`Items in cart: ${cart.length}`);
```

### Atomic Counters
Safely increment values using the `update` method.
```javascript
await tinyIDB.set('page_views', 0);

// Increment safely
await tinyIDB.update('page_views', count => (count || 0) + 1);
```

### localStorage Compatibility
`tiny-idb` provides aliases for `get`, `set`, and `remove` to match the `localStorage` API.
```javascript
await tinyIDB.setItem('session_id', 'xyz-123');
const sid = await tinyIDB.getItem('session_id');
await tinyIDB.removeItem('session_id');
```

### Simple Custom Database
If you only need one store per database, you can omit the `storeName`. It will automatically default to the same name as the database.
```javascript
// Creates/retrieves a DB named 'my-store' with an internal store also named 'my-store'
const store = tinyIDB.open('my-store');

await store.set('key', 'value');
```

### Multi-Instance Support
Use `open` to create isolated storage instances. Instances are cached internally.
```javascript
import { tinyIDB } from 'tiny-idb';

// Create isolated storage instances
const settings = tinyIDB.open('app-db', 'settings');
const cache = tinyIDB.open('app-db', 'cache');

await settings.set('theme', 'dark');
await cache.set('temp_data', { id: 1 });
```

## Development

`tiny-idb` is written in pure vanilla JavaScript. No compilation is required for development.

### Running Tests
```bash
npm test
```

### Running Tests on Minified Build
```bash
npm run test:min
```

### Minification
Generate the production-ready minified file:
```bash
npm run minify
```

## License

MIT © [Jelodar](https://github.com/Jelodar)
