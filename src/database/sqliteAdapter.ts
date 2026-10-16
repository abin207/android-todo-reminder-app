import type { LocalStore } from "./localStore";
import type { LocalTask } from "@/types/task";

/**
 * Capacitor SQLite adapter.
 *
 * It is loaded lazily and only on a native Android build (see
 * `installNativeStore`). The plugin is resolved through a runtime-computed
 * specifier so the web bundle never tries to resolve the optional native
 * dependency `@capacitor-community/sqlite`.
 */

interface SqliteRunResult {
  values?: unknown[];
}

interface SqliteConnection {
  open(): Promise<void>;
  execute(statements: string): Promise<unknown>;
  run(statement: string, values?: unknown[]): Promise<unknown>;
  query(statement: string, values?: unknown[]): Promise<SqliteRunResult>;
}

interface SqlitePlugin {
  createConnection(
    database: string,
    encrypted: boolean,
    mode: string,
    version: number,
    readonly: boolean,
  ): Promise<SqliteConnection>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

class SqliteStore implements LocalStore {
  constructor(private readonly db: SqliteConnection) {}

  async init(): Promise<void> {
    await this.db.open();
    await this.db.execute(SCHEMA);
  }

  async allTasks(): Promise<LocalTask[]> {
    const result = await this.db.query("SELECT payload FROM tasks");
    const rows = (result.values ?? []) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as LocalTask);
  }

  async getTask(id: string): Promise<LocalTask | null> {
    const result = await this.db.query("SELECT payload FROM tasks WHERE id = ?", [id]);
    const rows = (result.values ?? []) as Array<{ payload: string }>;
    return rows.length ? (JSON.parse(rows[0].payload) as LocalTask) : null;
  }

  async putTask(task: LocalTask): Promise<void> {
    await this.db.run(
      `INSERT INTO tasks (id, payload, updated_at, dirty) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload,
         updated_at = excluded.updated_at, dirty = excluded.dirty`,
      [task.id, JSON.stringify(task), task.updatedAt, task.dirty ? 1 : 0],
    );
  }

  async putTasks(tasks: LocalTask[]): Promise<void> {
    for (const task of tasks) {
      await this.putTask(task);
    }
  }

  async removeTask(id: string): Promise<void> {
    await this.db.run("DELETE FROM tasks WHERE id = ?", [id]);
  }

  async getMeta(key: string): Promise<string | null> {
    const result = await this.db.query("SELECT value FROM meta WHERE key = ?", [key]);
    const rows = (result.values ?? []) as Array<{ value: string }>;
    return rows.length ? rows[0].value : null;
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.db.run(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  }
}

export async function createSqliteStore(): Promise<LocalStore | null> {
  try {
    const specifier = ["@capacitor-community", "sqlite"].join("/");
    // Hidden from the bundler on purpose: the plugin only exists in the
    // native Android build, the web bundle must not try to resolve it.
    const dynamicImport = new Function("s", "return import(s)") as (
      s: string,
    ) => Promise<{ CapacitorSQLite?: SqlitePlugin }>;
    const mod = await dynamicImport(specifier);
    if (!mod.CapacitorSQLite) return null;
    const connection = await mod.CapacitorSQLite.createConnection(
      "todo-local",
      false,
      "no-encryption",
      1,
      false,
    );
    const store = new SqliteStore(connection);
    await store.init();
    return store;
  } catch (error) {
    console.warn("[sqlite] native store unavailable, falling back", error);
    return null;
  }
}
