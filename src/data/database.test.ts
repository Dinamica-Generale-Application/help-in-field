import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock expo-sqlite
const mockExecAsync = vi.fn();
const mockGetFirstAsync = vi.fn();
const mockCloseAsync = vi.fn();
const mockSqliteDb = {
  execAsync: mockExecAsync,
  getFirstAsync: mockGetFirstAsync,
  closeAsync: mockCloseAsync,
};

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(() => Promise.resolve(mockSqliteDb)),
  deleteDatabaseAsync: vi.fn(() => Promise.resolve()),
}));

// Mock drizzle-orm/expo-sqlite
const mockDrizzleDb = { query: {} };
vi.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: vi.fn(() => mockDrizzleDb),
}));

import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  _resetInstance,
} from './database';

describe('Database Service', () => {
  beforeEach(() => {
    _resetInstance();
    vi.clearAllMocks();
    // Default: integrity check passes
    mockGetFirstAsync.mockResolvedValue({ integrity_check: 'ok' });
    mockExecAsync.mockResolvedValue(undefined);
    mockCloseAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    _resetInstance();
  });

  describe('initializeDatabase', () => {
    it('should open the database and enable WAL mode', async () => {
      const result = await initializeDatabase();

      expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('field-service-reports.db');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA journal_mode = WAL;');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
      expect(result.wasRecovered).toBe(false);
    });

    it('should run integrity check on the database', async () => {
      await initializeDatabase();

      expect(mockGetFirstAsync).toHaveBeenCalledWith('PRAGMA integrity_check;');
    });

    it('should run migrations when database is healthy', async () => {
      await initializeDatabase();

      // Should have called execAsync with migration SQL (contains CREATE TABLE)
      const migrationCall = mockExecAsync.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE')
      );
      expect(migrationCall).toBeDefined();
    });

    it('should create Drizzle ORM instance', async () => {
      const result = await initializeDatabase();

      expect(drizzle).toHaveBeenCalledWith(mockSqliteDb);
      expect(result.db).toBe(mockDrizzleDb);
    });

    it('should return singleton on subsequent calls', async () => {
      const first = await initializeDatabase();
      const second = await initializeDatabase();

      expect(first).toBe(second);
      expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(1);
    });

    it('should recover when integrity check fails', async () => {
      mockGetFirstAsync.mockResolvedValue({ integrity_check: 'some error' });

      const result = await initializeDatabase();

      expect(result.wasRecovered).toBe(true);
      expect(mockCloseAsync).toHaveBeenCalled();
      expect(SQLite.deleteDatabaseAsync).toHaveBeenCalledWith('field-service-reports.db');
      // Should open a new database after deletion
      expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(2);
    });

    it('should recover when integrity check throws', async () => {
      mockGetFirstAsync.mockRejectedValue(new Error('disk I/O error'));

      const result = await initializeDatabase();

      expect(result.wasRecovered).toBe(true);
      expect(SQLite.deleteDatabaseAsync).toHaveBeenCalled();
    });

    it('should recover when opening database fails', async () => {
      (SQLite.openDatabaseAsync as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('database file corrupted'))
        .mockResolvedValue(mockSqliteDb);

      const result = await initializeDatabase();

      expect(result.wasRecovered).toBe(true);
    });

    it('should throw if both initialization and recovery fail', async () => {
      (SQLite.openDatabaseAsync as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('original error'));
      (SQLite.deleteDatabaseAsync as ReturnType<typeof vi.fn>)
        .mockResolvedValue(undefined);
      (SQLite.openDatabaseAsync as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('recovery also failed'));

      await expect(initializeDatabase()).rejects.toThrow(
        'Failed to initialize database and recovery also failed'
      );
    });

    it('should still recover if deleteDatabaseAsync fails', async () => {
      mockGetFirstAsync.mockResolvedValue({ integrity_check: 'corruption detected' });
      (SQLite.deleteDatabaseAsync as ReturnType<typeof vi.fn>)
        .mockRejectedValue(new Error('delete failed'));
      // openDatabaseAsync: first call returns corrupted db, second returns fresh
      (SQLite.openDatabaseAsync as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockSqliteDb)
        .mockResolvedValueOnce(mockSqliteDb);

      const result = await initializeDatabase();

      // Should still recover even if delete failed (maybe file was already gone)
      expect(result.wasRecovered).toBe(true);
    });
  });

  describe('getDatabase', () => {
    it('should throw if database is not initialized', () => {
      expect(() => getDatabase()).toThrow(
        'Database not initialized. Call initializeDatabase() first.'
      );
    });

    it('should return instance after initialization', async () => {
      await initializeDatabase();

      const instance = getDatabase();
      expect(instance.db).toBe(mockDrizzleDb);
      expect(instance.sqliteDb).toBe(mockSqliteDb);
    });
  });

  describe('closeDatabase', () => {
    it('should close the connection and clear the singleton', async () => {
      await initializeDatabase();
      await closeDatabase();

      expect(mockCloseAsync).toHaveBeenCalled();
      expect(() => getDatabase()).toThrow();
    });

    it('should do nothing if already closed', async () => {
      await closeDatabase(); // No-op
      expect(mockCloseAsync).not.toHaveBeenCalled();
    });
  });
});
