import { IDatabaseAdapter, DbType, DbConfig } from './adapters/IDatabaseAdapter';
import { SqliteAdapter } from './adapters/SqliteAdapter';
import { PostgresAdapter } from './adapters/PostgresAdapter';
import { MysqlAdapter } from './adapters/MysqlAdapter';
import { MongoAdapter } from './adapters/MongoAdapter';

/**
 * DatabaseFactory — Factory Pattern (SOLID-O, SOLID-D).
 * Creates the appropriate database adapter based on configuration.
 * Open for extension: add new adapters without modifying this code.
 */
export class DatabaseFactory {
  static create(config: DbConfig): IDatabaseAdapter {
    switch (config.type) {
      case 'sqlite':
        return new SqliteAdapter(config.sqlitePath);

      case 'postgres':
        if (!config.host || !config.database || !config.username) {
          throw new Error('PostgreSQL requires: host, database, username');
        }
        return new PostgresAdapter({
          host: config.host,
          port: config.port || 5432,
          database: config.database,
          username: config.username,
          password: config.password || '',
        });

      case 'mysql':
        if (!config.host || !config.database || !config.username) {
          throw new Error('MySQL requires: host, database, username');
        }
        return new MysqlAdapter({
          host: config.host,
          port: config.port || 3306,
          database: config.database,
          username: config.username,
          password: config.password || '',
        });

      case 'mongodb':
        if (!config.mongoUri) {
          throw new Error('MongoDB requires: mongoUri');
        }
        return new MongoAdapter(config.mongoUri);

      default:
        throw new Error(`Unsupported database type: ${config.type}. Supported: sqlite, postgres, mysql, mongodb`);
    }
  }

  static getConfigFromEnv(): DbConfig {
    const type = (process.env.DB_TYPE || 'sqlite') as DbType;

    const config: DbConfig = { type };

    switch (type) {
      case 'sqlite':
        config.sqlitePath = process.env.DB_SQLITE_PATH || undefined;
        break;

      case 'postgres':
      case 'mysql':
        config.host = process.env.DB_HOST || 'localhost';
        config.port = parseInt(process.env.DB_PORT || (type === 'postgres' ? '5432' : '3306'));
        config.database = process.env.DB_NAME || 'quickshare';
        config.username = process.env.DB_USER || 'quickshare';
        config.password = process.env.DB_PASSWORD || '';
        break;

      case 'mongodb':
        config.mongoUri = process.env.DB_MONGO_URI || 'mongodb://localhost:27017/quickshare';
        break;
    }

    return config;
  }
}

export default DatabaseFactory;
