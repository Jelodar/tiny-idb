/** tiny-idb - MIT © Jelodar */

export interface TinyIDBInstance {
  /**
   * Creates or retrieves a cached instance of a database and store.
   * @param dbName Name of the IndexedDB database.
   * @param storeName Name of the object store (defaults to dbName).
   */
  open(dbName: string, storeName?: string): TinyIDBInstance;

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
   */
  entries<K = any, V = any>(): Promise<[K, V][]>;

  /**
   * Returns the total number of entries.
   */
  count(): Promise<number>;

  /**
   * Performs an atomic read-modify-write operation within a single transaction.
   * Note: The function 'fn' must be synchronous or microtask-only (no await on fetch/setTimeout) 
   * to prevent the IndexedDB transaction from auto-committing.
   * @param key The key to update.
   * @param fn A function that receives the current value and returns the new value.
   */
  update<T = any>(key: any, fn: (currentValue: T | undefined) => T | Promise<T>): Promise<void>;

  /**
   * Atomically appends a value to an array. Initializes as [value] if key doesn't exist.
   */
  push(key: any, value: any): Promise<void>;

  /**
   * Atomically shallow-merges an object. Initializes as patch if key doesn't exist.
   */
  merge(key: any, patch: object): Promise<void>;
}

export const tinyIDB: TinyIDBInstance;
export default tinyIDB;
