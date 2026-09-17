/**
 * IDatabaseAdapter — Abstraction for all database implementations.
 * Dependency Inversion Principle (SOLID-D): 
 *   High-level modules depend on this abstraction, not concrete DBs.
 * 
 * Open/Closed Principle (SOLID-O):
 *   New databases can be added without modifying existing code.
 */

export interface ShareRecord {
  id: string;
  type: 'file' | 'text';
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  content: string | null;
  file_path: string | null;
  password_hash: string | null;
  max_downloads: number | null;
  downloads: number;
  created_at: string;
  expires_at: string | null;
}

export interface SettingRecord {
  key: string;
  value: string;
  category: string;
  description: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
  last_login: string | null;
}

export interface DbStats {
  totalShares: number;
  totalDownloads: number;
  activeShares: number;
  expiredShares: number;
  totalStorage: number;
  dbType: string;
}

export interface IDatabaseAdapter {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isHealthy(): Promise<boolean>;

  // Shares CRUD
  createShare(share: Omit<ShareRecord, 'downloads' | 'created_at'>): Promise<ShareRecord>;
  findShareById(id: string): Promise<ShareRecord | null>;
  incrementShareDownloads(id: string): Promise<void>;
  deleteShare(id: string): Promise<void>;
  listShares(options?: { limit?: number; offset?: number; type?: string }): Promise<ShareRecord[]>;
  cleanupExpired(): Promise<number>;

  // Settings CRUD
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string, category?: string, description?: string): Promise<void>;
  getAllSettings(): Promise<SettingRecord[]>;
  getSettingsByCategory(category: string): Promise<SettingRecord[]>;
  deleteSetting(key: string): Promise<void>;

  // Admin users
  createAdmin(user: Omit<AdminUser, 'created_at' | 'last_login'>): Promise<AdminUser>;
  findAdminByUsername(username: string): Promise<AdminUser | null>;
  findAdminById(id: string): Promise<AdminUser | null>;
  updateAdminLastLogin(id: string): Promise<void>;
  changeAdminPassword(id: string, newHash: string): Promise<void>;

  // Stats
  getStats(): Promise<DbStats>;
}

export type DbType = 'sqlite' | 'postgres' | 'mysql' | 'mongodb';

export interface DbConfig {
  type: DbType;
  // SQLite
  sqlitePath?: string;
  // PostgreSQL / MySQL
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  // MongoDB
  mongoUri?: string;
}
