import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { SCHEMA } from './schema.ts';
import { findProjectRoot } from '../find-root.ts';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let wrapper: SqlJsWrapper | null = null;
let inTransaction = false;

// ---------------------------------------------------------------------------
// PreparedStatement — mimics better-sqlite3's Statement API
// ---------------------------------------------------------------------------

class PreparedStatement {
  db: SqlJsDatabase;
  sql: string;
  owner: SqlJsWrapper;

  constructor(db: SqlJsDatabase, sql: string, owner: SqlJsWrapper) {
    this.db = db;
    this.sql = sql;
    this.owner = owner;
  }

  /**
   * Convert better-sqlite3 style named params `{ id, title }` to sql.js
   * style `{ "@id": ..., "@title": ... }`.  Positional args are passed as
   * arrays.
   */
  normalizeParams(args: unknown[]): unknown[] | Record<string, unknown> {
    if (args.length === 0) return [];

    // Single object arg → named parameters
    if (
      args.length === 1 &&
      args[0] !== null &&
      typeof args[0] === 'object' &&
      !Array.isArray(args[0])
    ) {
      const obj = args[0] as Record<string, unknown>;
      const mapped: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        mapped[`@${key}`] = value;
      }
      return mapped;
    }

    // Positional args
    return args;
  }

  /**
   * Execute a write statement (INSERT / UPDATE / DELETE).
   */
  run(...args: unknown[]): { changes: number; lastInsertRowid: number } {
    const params = this.normalizeParams(args);
    this.db.run(this.sql, params as any);
    const changes = this.db.getRowsModified();

    // Persist after every write unless we're inside a transaction
    if (!inTransaction) {
      this.owner.persist();
    }

    return { changes, lastInsertRowid: 0 };
  }

  /**
   * Fetch a single row (like better-sqlite3's `.get()`).
   */
  get(...args: unknown[]): any {
    const params = this.normalizeParams(args);
    const stmt = this.db.prepare(this.sql);
    try {
      if (Array.isArray(params)) {
        stmt.bind(params.length > 0 ? params : undefined);
      } else {
        stmt.bind(params as any);
      }
      if (stmt.step()) {
        return stmt.getAsObject() as Record<string, unknown>;
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  /**
   * Fetch all matching rows (like better-sqlite3's `.all()`).
   */
  all(...args: unknown[]): any[] {
    const params = this.normalizeParams(args);
    const rows: any[] = [];
    const stmt = this.db.prepare(this.sql);
    try {
      if (Array.isArray(params)) {
        stmt.bind(params.length > 0 ? params : undefined);
      } else {
        stmt.bind(params as any);
      }
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as Record<string, unknown>);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }
}

// ---------------------------------------------------------------------------
// SqlJsWrapper — drop-in replacement for the better-sqlite3 Database object
// ---------------------------------------------------------------------------

class SqlJsWrapper {
  db: SqlJsDatabase;
  dbPath: string;

  constructor(db: SqlJsDatabase, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(this.db, sql, this);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  pragma(pragmaStr: string): unknown {
    // WAL mode is meaningless for sql.js (in-memory) — silently skip
    if (/journal_mode\s*=\s*wal/i.test(pragmaStr)) {
      return undefined;
    }
    const result = this.db.exec(`PRAGMA ${pragmaStr}`);
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0];
    }
    return undefined;
  }

  /**
   * Return a function that, when called, executes `fn` inside a transaction.
   */
  transaction<T>(fn: () => T): () => T {
    return () => {
      this.db.run('BEGIN');
      inTransaction = true;
      try {
        const result = fn();
        this.db.run('COMMIT');
        inTransaction = false;
        this.persist();
        return result;
      } catch (err) {
        inTransaction = false;
        this.db.run('ROLLBACK');
        throw err;
      }
    };
  }

  /**
   * Persist the in-memory database to disk using atomic write-to-tmp +
   * rename.
   */
  persist(): void {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    const tmpPath = `${this.dbPath}.tmp`;
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, this.dbPath);
  }

  close(): void {
    try {
      this.persist();
    } catch {
      // best-effort on close
    }
    this.db.close();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Asynchronously initialise the sql.js database.
 *
 * Loads the WASM binary, reads an existing DB file from disk (if present),
 * applies the schema, and enables foreign keys.
 */
export async function initDb(): Promise<SqlJsWrapper> {
  if (wrapper) return wrapper;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'dashboard.db');

  // Locate the sql.js WASM file using dynamic root detection
  // (works from both src/lib/db/ and dist/src/lib/db/)
  const projectRoot = findProjectRoot(import.meta.url);
  const wasmPath = path.join(
    projectRoot,
    'node_modules',
    'sql.js',
    'dist',
    'sql-wasm.wasm',
  );

  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  // Load existing DB file if available
  let db: SqlJsDatabase;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  wrapper = new SqlJsWrapper(db, dbPath);
  wrapper.pragma('foreign_keys = ON');
  wrapper.exec(SCHEMA);

  return wrapper;
}

/**
 * Return the initialised wrapper (synchronous).
 * Throws if `initDb()` has not been called yet.
 */
export function getDb(): SqlJsWrapper {
  if (!wrapper) {
    throw new Error(
      'Database not initialised. Call initDb() before getDb().',
    );
  }
  return wrapper;
}

/**
 * Persist and close the database, resetting the singleton.
 */
export function closeDb(): void {
  if (wrapper) {
    wrapper.close();
    wrapper = null;
  }
}
