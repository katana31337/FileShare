import { DatabaseFactory } from './DatabaseFactory';
import { IDatabaseAdapter } from './adapters/IDatabaseAdapter';

/**
 * Database singleton — initialized via factory.
 * Re-exports the active adapter instance.
 */
let _db: IDatabaseAdapter | null = null;

export async function initializeDatabase(): Promise<IDatabaseAdapter> {
  if (_db) return _db;

  const config = DatabaseFactory.getConfigFromEnv();
  _db = DatabaseFactory.create(config);
  await _db.connect();

  console.log(`✅ Database connected: ${config.type}`);
  return _db;
}

export function getDatabase(): IDatabaseAdapter {
  if (!_db) throw new Error('Database not initialized. Call initializeDatabase() first.');
  return _db;
}

// Backward compatibility — lazy init for routes that import 'database' directly
export const database: IDatabaseAdapter = new Proxy({} as IDatabaseAdapter, {
  get(_target, prop) {
    if (!_db) {
      // Return a function that throws on call
      return () => { throw new Error('Database not initialized'); };
    }
    return (_db as any)[prop];
  }
});

export { IDatabaseAdapter, DatabaseFactory };
