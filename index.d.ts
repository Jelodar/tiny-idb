/** tiny-idb - MIT © Jelodar */

export const MODE_RO: 'readonly';
export const MODE_RW: 'readwrite';
export const DIR_NEXT: 'next';
export const DIR_PREV: 'prev';

export interface TinyIDBInstance {
  /**
   * Creates or retrieves a cached instance of a database and store.
   * Note: Multiple calls in the same microtask (tick) are automatically batched 
   * into a single IndexedDB transaction for 10x-100x performance.
   * Note: Supports multiple stores in the same database with automatic versioning.
   * @param dbName Name of the IndexedDB database.
   * @param storeName Name of the object store (defaults to dbName).
   * @param batching Set to false to disable automatic batching (defaults to true).
   */
  open(dbName: string, storeName?: string, batching?: boolean): TinyIDBInstance;
  /** Shorthand for open(dbName, dbName, batching) */
  open(dbName: string, batching?: boolean): TinyIDBInstance;

  /**
   * Persists a value to the store.
   */
  set(key: any, value: any): Promise<void>;
  /** Alias for set() */
  setItem(key: any, value: any): Promise<void>;

  /**
   * Retrieves a value; returns undefined if not found.
   */
  get<T = any>(key: any): Promise<T | undefined>;
  /** Alias for get() */
  getItem<T = any>(key: any): Promise<T | undefined>;

  /**
   * Deletes a specific key.
   */
  remove(key: any): Promise<void>;
  /** Alias for remove() */
  removeItem(key: any): Promise<void>;

  /**
   * Removes all data from the store.
   */
  clear(): Promise<void>;

  /**
   * Returns an array of all keys.
   */
  keys(): Promise<any[]>;

  /**
   * Returns an array of all values.
   */
  values<T = any>(): Promise<T[]>;

  /**
   * Returns an array of [key, value] pairs.
   * @param filterFn Optional function to filter entries during iteration.
   */
  entries<K = any, V = any>(filterFn?: (value: V, key: K) => boolean): Promise<[K, V][]>;

  /**
   * Paginated cursor iteration.
   * @param limit Maximum number of items to return. Use null for no limit.
   * @param start Optional key or IDBKeyRange to start iteration at.
   * @param direction Optional cursor direction ('next', 'prev', etc).
   * @param filterFn Optional function to filter entries.
   */
  paginate<K = any, V = any>(
    limit: number | null, 
    start?: K | IDBKeyRange, 
    direction?: string,
    filterFn?: (value: V, key: K) => boolean
  ): Promise<{ items: [K, V][], next: K | null }>;

  /**
   * Returns the total number of entries.
   */
  count(): Promise<number>;

  /**
   * Checks if a key exists in the store.
   */
  has(key: any): Promise<boolean>;

  /**
   * Provides direct access to the IDBObjectStore within a transaction.
   * This provides an "escape hatch" to use native IndexedDB features like cursors, ranges, and search.
   * @param cb A callback that receives the IDBObjectStore.
   * @param mode The transaction mode: 'readonly' (default) or 'readwrite'.
   */
  raw<T = any>(cb: (store: IDBObjectStore) => T | Promise<T>, mode?: 'readonly' | 'readwrite'): Promise<T>;

  /**
   * Performs an atomic read-modify-write operation within a single transaction.
   * Note: The function 'fn' must stay within the transaction lifetime. Crossing a task boundary
   * such as setTimeout or an unrelated network request will reject with TransactionInactiveError.
   * @param key The key to update.
   * @param fn A function that receives the current value and returns the new value.
   */
  update<T = any, K = any>(key: K, fn: (currentValue: T | undefined) => T | Promise<T>): Promise<K>;

  /**
   * Atomically appends a value to an array. Initializes as [value] if key doesn't exist.
   */
  push<K = any>(key: K, value: any): Promise<K>;

  /**
   * Atomically shallow-merges a non-null object patch. Initializes as patch if key doesn't exist.
   */
  merge<K = any>(key: K, patch: Record<PropertyKey, any>): Promise<K>;

  readonly MODE_RO: 'readonly';
  readonly MODE_RW: 'readwrite';
  readonly DIR_NEXT: 'next';
  readonly DIR_PREV: 'prev';
}

export const tinyIDB: TinyIDBInstance;
export default tinyIDB;
