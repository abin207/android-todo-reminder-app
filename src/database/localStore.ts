import type { LocalTask } from "@/types/task";

/**
 * Storage port used by every service. The app is local-first: this store is
 * the operational database. Two adapters implement it:
 *  - IndexedDB (web / PWA / dev)
 *  - Capacitor SQLite (Android build) — see `sqliteAdapter.ts`
 */
export interface LocalStore {
  init(): Promise<void>;
  allTasks(): Promise<LocalTask[]>;
  getTask(id: string): Promise<LocalTask | null>;
  putTask(task: LocalTask): Promise<void>;
  putTasks(tasks: LocalTask[]): Promise<void>;
  removeTask(id: string): Promise<void>;
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
}

export const DB_NAME = "todo-local";
export const DB_VERSION = 1;
export const TASK_STORE = "tasks";
export const META_STORE = "meta";

class MemoryStore implements LocalStore {
  private tasks = new Map<string, LocalTask>();
  private meta = new Map<string, string>();

  async init(): Promise<void> {}
  async allTasks(): Promise<LocalTask[]> {
    return [...this.tasks.values()];
  }
  async getTask(id: string): Promise<LocalTask | null> {
    return this.tasks.get(id) ?? null;
  }
  async putTask(task: LocalTask): Promise<void> {
    this.tasks.set(task.id, task);
  }
  async putTasks(tasks: LocalTask[]): Promise<void> {
    tasks.forEach((task) => this.tasks.set(task.id, task));
  }
  async removeTask(id: string): Promise<void> {
    this.tasks.delete(id);
  }
  async getMeta(key: string): Promise<string | null> {
    return this.meta.get(key) ?? null;
  }
  async setMeta(key: string, value: string): Promise<void> {
    this.meta.set(key, value);
  }
}

class IndexedDbStore implements LocalStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(TASK_STORE)) {
          db.createObjectStore(TASK_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB failed"));
    });
    return this.dbPromise;
  }

  private async tx<T>(
    storeName: string,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const request = run(transaction.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB error"));
    });
  }

  async init(): Promise<void> {
    await this.open();
  }

  async allTasks(): Promise<LocalTask[]> {
    const rows = await this.tx<LocalTask[]>(TASK_STORE, "readonly", (store) =>
      store.getAll() as IDBRequest<LocalTask[]>,
    );
    return rows ?? [];
  }

  async getTask(id: string): Promise<LocalTask | null> {
    const row = await this.tx<LocalTask | undefined>(TASK_STORE, "readonly", (store) =>
      store.get(id) as IDBRequest<LocalTask | undefined>,
    );
    return row ?? null;
  }

  async putTask(task: LocalTask): Promise<void> {
    await this.tx(TASK_STORE, "readwrite", (store) => store.put(task));
  }

  async putTasks(tasks: LocalTask[]): Promise<void> {
    if (!tasks.length) return;
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(TASK_STORE, "readwrite");
      const store = transaction.objectStore(TASK_STORE);
      tasks.forEach((task) => store.put(task));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("IndexedDB bulk write failed"));
    });
  }

  async removeTask(id: string): Promise<void> {
    await this.tx(TASK_STORE, "readwrite", (store) => store.delete(id));
  }

  async getMeta(key: string): Promise<string | null> {
    const value = await this.tx<string | undefined>(META_STORE, "readonly", (store) =>
      store.get(key) as IDBRequest<string | undefined>,
    );
    return value ?? null;
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.tx(META_STORE, "readwrite", (store) => store.put(value, key));
  }
}

let store: LocalStore | null = null;

/** Returns the platform-appropriate local store (singleton). */
export function getLocalStore(): LocalStore {
  if (store) return store;
  const hasIndexedDb = typeof window !== "undefined" && "indexedDB" in window;
  store = hasIndexedDb ? new IndexedDbStore() : new MemoryStore();
  return store;
}

/** Test seam: inject a custom adapter (e.g. the Capacitor SQLite adapter). */
export function setLocalStore(custom: LocalStore): void {
  store = custom;
}

/** In-memory adapter, used by tests and during SSR. */
export function createMemoryStore(): LocalStore {
  return new MemoryStore();
}
