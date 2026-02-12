import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SCHEMA } from './schema';

let db: Database.Database | null = null;

/**
 * Return (and lazily initialise) the singleton SQLite connection.
 *
 * The database file lives at `<project-root>/data/dashboard.db`.
 * WAL journal mode is enabled for better concurrent-read performance and
 * foreign-key constraints are enforced.
 */
export function getDb(): Database.Database {
  if (!db) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(path.join(dataDir, 'dashboard.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
  }
  return db;
}

/**
 * Close the database connection and reset the singleton so that a subsequent
 * call to `getDb()` will open a fresh connection.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
