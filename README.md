# tiny-idb

**A minimalist, high-performance IndexedDB wrapper for modern web applications.**

`tiny-idb` provides a non-blocking, asynchronous alternative to `localStorage`. It is designed for developers who require the durability and capacity of IndexedDB without the complexity of its native API. By focusing on a single-store, key-value architecture, it eliminates the need for database versioning and boilerplate configuration.

[![NPM Version](https://img.shields.io/npm/v/tiny-idb.svg)](https://www.npmjs.com/package/tiny-idb)
[![License](https://img.shields.io/npm/l/tiny-idb.svg)](LICENSE)
[![Size](https://img.shields.io/bundlephobia/minzip/tiny-idb)](https://bundlephobia.com/package/tiny-idb)

## Core Advantages

### Architectural Simplicity
Native IndexedDB requires managing requests, transactions, and version upgrades. `tiny-idb` abstracts these into a predictable, promise-based API. It acts as a drop-in replacement for `localStorage` logic, allowing for an immediate transition to persistent, non-blocking storage.

### Guaranteed Atomicity
The primary weakness of most storage wrappers is the "read-modify-write" race condition. If two parts of an application attempt to update the same key simultaneously, data loss often occurs. `tiny-idb` addresses this by executing `update`, `push`, and `merge` operations within a single IndexedDB transaction, ensuring that updates are processed sequentially and reliably.

### Resource Efficiency
At only **596 bytes** (gzipped), the library introduces negligible overhead to your bundle. It is dependency-free and written in modern vanilla JavaScript, ensuring high performance across all environments that support IndexedDB.

### Intelligent Lifecycle Management
The library handles database connection pooling, tab synchronization, and error recovery automatically. If a database connection is blocked by another tab or fails due to an environmental error, `tiny-idb` gracefully resets and recovers without requiring a page reload.

### Zero-Configuration Portability
Beyond npm installation, `tiny-idb` is designed for maximum portability. As a single-file, dependency-free module, it can be integrated into any environment by simply dropping `tiny-idb.js` into a project directory. This makes it an ideal solution for rapid prototyping, legacy system upgrades, and environments where complex build pipelines are unavailable.

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

*   **Minified Module**: `https://unpkg.com/tiny-idb/tiny-idb.min.js` (596 bytes gzipped)
*   **Source**: `https://unpkg.com/tiny-idb/tiny-idb.js`

## Technical Comparison

| Feature | localStorage | tiny-idb |
|---------|--------------|----------|
| **Execution** | Synchronous (Blocks UI) | Asynchronous (Non-blocking) |
| **Storage Limit** | ~5-10MB | Disk-limited |
| **Data Types** | Strings only | Objects, Blobs, Arrays, Numbers |
| **Data Integrity** | Basic | ACID Compliant |
| **Race Condition Safety** | None | Atomic `update`/`push`/`merge` |

## API Reference

| Method | Description |
|--------|-------------|
| `get(key)` | Retrieves a value; returns `undefined` if not found. |
| `set(key, value)` | Persists a value to the store. |
| `remove(key)` | Deletes a specific key. |
| `clear()` | Removes all data from the store. |
| `keys()` | Returns an array of all keys. |
| `values()` | Returns an array of all values. |
| `count()` | Returns the total number of entries. |
| `update(key, fn)` | Performs an atomic read-modify-write operation. |
| `push(key, value)` | Atomically appends a value to an array. |
| `merge(key, object)` | Atomically shallow-merges an object. |

## License

MIT © [Jelodar](https://github.com/Jelodar)
