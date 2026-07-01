import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

const DATABASE_NAME = 'field-service-reports.db';

/**
 * SQL migration for the initial schema.
 * Creates tables for reports and attachments with all constraints and indices.
 */
const INITIAL_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'completed')),
  
  -- Dati cliente
  company_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  vat_number TEXT,
  
  -- Dettagli intervento
  intervention_date TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  intervention_location TEXT,
  intervention_lat REAL,
  intervention_lon REAL,
  requested_by TEXT,
  on_behalf_of TEXT,
  intervention_reason TEXT CHECK(intervention_reason IN ('installation', 'supervision', 'malfunction', 'other')),
  description TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  production_year TEXT,
  warranty TEXT CHECK(warranty IN ('in_warranty', 'out_warranty')),
  payment TEXT CHECK(payment IN ('paid', 'unpaid')),
  
  -- Costi
  hours_worked REAL,
  kilometers REAL,
  discount_percent REAL DEFAULT 0,
  hourly_total REAL,
  kilometer_total REAL,
  subtotal REAL,
  discount_amount REAL,
  discounted_subtotal REAL,
  vat_amount REAL,
  grand_total REAL,
  
  -- Note
  notes TEXT,
  
  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('image', 'video')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  production_year TEXT,
  warranty TEXT CHECK(warranty IN ('in_warranty', 'out_warranty')),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(intervention_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_company ON reports(company_name);
CREATE INDEX IF NOT EXISTS idx_reports_serial ON reports(serial_number);
CREATE INDEX IF NOT EXISTS idx_attachments_report ON attachments(report_id);
CREATE INDEX IF NOT EXISTS idx_devices_report ON devices(report_id);
`;

/**
 * Migration v2: Add GPS columns to reports and create devices table.
 * Uses ALTER TABLE for backward compatibility with existing databases.
 */
const MIGRATION_V2_SQL = `
-- Add GPS columns to reports (nullable, no constraint)
ALTER TABLE reports ADD COLUMN intervention_lat REAL;
ALTER TABLE reports ADD COLUMN intervention_lon REAL;

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  production_year TEXT,
  warranty TEXT CHECK(warranty IN ('in_warranty', 'out_warranty')),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_devices_report ON devices(report_id);
`;

/** Result of database initialization */
export interface DatabaseInitResult {
  /** The Drizzle ORM database instance */
  db: ExpoSQLiteDatabase;
  /** The underlying expo-sqlite database instance */
  sqliteDb: SQLite.SQLiteDatabase;
  /** Whether the database was recovered from corruption */
  wasRecovered: boolean;
}

/** Singleton state */
let _dbInstance: DatabaseInitResult | null = null;

/**
 * Enable WAL (Write-Ahead Logging) mode for better concurrent read performance
 * and reduced risk of database corruption.
 */
async function enableWalMode(sqliteDb: SQLite.SQLiteDatabase): Promise<void> {
  await sqliteDb.execAsync('PRAGMA journal_mode = WAL;');
  await sqliteDb.execAsync('PRAGMA foreign_keys = ON;');
}

/**
 * Run the initial database migration (creates tables if they don't exist).
 * Then applies incremental migrations for schema evolution.
 */
async function runMigrations(sqliteDb: SQLite.SQLiteDatabase): Promise<void> {
  await sqliteDb.execAsync(INITIAL_MIGRATION_SQL);

  // Apply v2 migration if needed (adds GPS columns and devices table)
  await applyMigrationV2(sqliteDb);

  // Apply v3 migration (clients table for autocomplete)
  await applyMigrationV3(sqliteDb);
}

/**
 * Migration v3: Create clients table for autocomplete/CSV import.
 */
async function applyMigrationV3(sqliteDb: SQLite.SQLiteDatabase): Promise<void> {
  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      address TEXT,
      phone TEXT
    );
  `);
  await sqliteDb.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(company_name);`
  );
}

/**
 * Applies migration v2: GPS columns and devices table.
 * Checks if columns/table already exist before altering.
 */
async function applyMigrationV2(sqliteDb: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if intervention_lat column already exists
    const columns = await sqliteDb.getAllAsync<{ name: string }>(
      `PRAGMA table_info(reports);`
    );
    const columnNames = columns.map((c) => c.name);

    if (!columnNames.includes('intervention_lat')) {
      await sqliteDb.execAsync(
        `ALTER TABLE reports ADD COLUMN intervention_lat REAL;`
      );
    }
    if (!columnNames.includes('intervention_lon')) {
      await sqliteDb.execAsync(
        `ALTER TABLE reports ADD COLUMN intervention_lon REAL;`
      );
    }
  } catch {
    // If PRAGMA table_info fails (e.g. in test mocks), try ALTER TABLE directly
    // and ignore errors if columns already exist
    try {
      await sqliteDb.execAsync(
        `ALTER TABLE reports ADD COLUMN intervention_lat REAL;`
      );
    } catch {
      // Column likely already exists
    }
    try {
      await sqliteDb.execAsync(
        `ALTER TABLE reports ADD COLUMN intervention_lon REAL;`
      );
    } catch {
      // Column likely already exists
    }
  }

  // Create devices table if it doesn't exist
  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      model TEXT,
      serial_number TEXT,
      production_year TEXT,
      warranty TEXT CHECK(warranty IN ('in_warranty', 'out_warranty')),
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );
  `);
  await sqliteDb.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_devices_report ON devices(report_id);`
  );
}

/**
 * Perform an integrity check on the database.
 * Returns true if the database is healthy, false if corrupted.
 */
async function checkIntegrity(sqliteDb: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const result = await sqliteDb.getFirstAsync<{ integrity_check: string }>(
      'PRAGMA integrity_check;'
    );
    return result?.integrity_check === 'ok';
  } catch {
    return false;
  }
}

/**
 * Delete the database and recreate it from scratch.
 * This is the recovery strategy for a corrupted database.
 */
async function recoverDatabase(): Promise<SQLite.SQLiteDatabase> {
  // Delete the corrupted database
  try {
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  } catch {
    // If deletion fails, try opening fresh anyway — the file might already be gone
  }

  // Open a fresh database
  const sqliteDb = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await enableWalMode(sqliteDb);
  await runMigrations(sqliteDb);

  return sqliteDb;
}

/**
 * Initialize the database connection.
 * 
 * - Opens (or creates) the SQLite database file
 * - Enables WAL mode for better performance
 * - Runs migrations to ensure schema is up-to-date
 * - If the database is corrupted, automatically recovers by deleting and recreating it
 * 
 * Returns a singleton instance. Subsequent calls return the same instance.
 * 
 * @throws Error if initialization fails after recovery attempt
 */
export async function initializeDatabase(): Promise<DatabaseInitResult> {
  if (_dbInstance !== null) {
    return _dbInstance;
  }

  let wasRecovered = false;
  let sqliteDb: SQLite.SQLiteDatabase;

  try {
    // Attempt to open the existing database
    sqliteDb = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Enable WAL mode
    await enableWalMode(sqliteDb);

    // Run integrity check
    const isHealthy = await checkIntegrity(sqliteDb);

    if (!isHealthy) {
      // Database is corrupted — attempt recovery
      console.warn('[Database] Integrity check failed. Attempting recovery...');
      await sqliteDb.closeAsync();
      sqliteDb = await recoverDatabase();
      wasRecovered = true;
      console.warn('[Database] Recovery successful. Database recreated.');
    } else {
      // Database is healthy — run migrations
      await runMigrations(sqliteDb);
    }
  } catch (error) {
    // If opening/initialization fails entirely, try recovery
    console.warn('[Database] Initialization failed. Attempting recovery...', error);
    try {
      sqliteDb = await recoverDatabase();
      wasRecovered = true;
      console.warn('[Database] Recovery successful after initialization failure.');
    } catch (recoveryError) {
      throw new Error(
        `[Database] Failed to initialize database and recovery also failed: ${
          recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
        }`
      );
    }
  }

  // Create Drizzle ORM instance
  const db = drizzle(sqliteDb);

  _dbInstance = { db, sqliteDb, wasRecovered };
  return _dbInstance;
}

/**
 * Get the current database instance.
 * Throws if the database has not been initialized yet.
 * Use `initializeDatabase()` first.
 */
export function getDatabase(): DatabaseInitResult {
  if (_dbInstance === null) {
    throw new Error(
      '[Database] Database not initialized. Call initializeDatabase() first.'
    );
  }
  return _dbInstance;
}

/**
 * Close the database connection and clear the singleton.
 * Useful for testing or app shutdown.
 */
export async function closeDatabase(): Promise<void> {
  if (_dbInstance !== null) {
    await _dbInstance.sqliteDb.closeAsync();
    _dbInstance = null;
  }
}

/**
 * Reset the singleton instance without closing (for testing purposes).
 * @internal
 */
export function _resetInstance(): void {
  _dbInstance = null;
}
