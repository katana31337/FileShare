import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {
  IDatabaseAdapter,
  ShareRecord,
  SettingRecord,
  AdminUser,
  DbStats,
} from './IDatabaseAdapter';

/**
 * SQLiteAdapter — Default database implementation.
 * Single Responsibility: handles SQLite-specific operations.
 */
export class SqliteAdapter implements IDatabaseAdapter {
  private db!: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'quickshare.db');
  }

  async connect(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    await this.initialize();
  }

  async disconnect(): Promise<void> {
    this.db?.close();
  }

  async isHealthy(): Promise<boolean> {
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  private async initialize(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('file', 'text')),
        file_name TEXT,
        file_size INTEGER,
        mime_type TEXT,
        content TEXT,
        file_path TEXT,
        password_hash TEXT,
        max_downloads INTEGER,
        downloads INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        description TEXT DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_shares_expires ON shares(expires_at);
      CREATE INDEX IF NOT EXISTS idx_shares_created ON shares(created_at);
      CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
    `);

    // Insert default settings if not exist
    this.insertDefaultSettings();
  }

  private insertDefaultSettings(): void {
    const defaults: Array<[string, string, string, string]> = [
      ['site_name', 'QuickShare', 'general', 'Название сервиса'],
      ['site_description', 'Анонимный обмен файлами и текстом', 'general', 'Описание сервиса'],
      ['site_icon', '🔗', 'general', 'Иконка сервиса (emoji)'],
      ['site_logo_url', '', 'general', 'URL логотипа (если есть)'],
      ['primary_color', '#9333ea', 'general', 'Основной цвет темы'],
      ['max_file_size', '104857600', 'limits', 'Макс. размер файла (байт)'],
      ['max_text_length', '50000', 'limits', 'Макс. длина текста'],
      ['default_expiry', '86400', 'limits', 'Срок жизни по умолчанию (сек)'],
      ['max_downloads_default', '0', 'limits', 'Лимит скачиваний по умолчанию (0=безлимит)'],
      ['allow_password', 'true', 'security', 'Разрешить пароли'],
      ['require_password', 'false', 'security', 'Требовать пароль всегда'],
      ['auto_delete_downloaded', 'false', 'security', 'Удалять после скачивания'],
      ['enable_registration', 'false', 'security', 'Разрешить регистрацию'],
      ['admin_panel_path', 'admin', 'admin', 'URL путь к админ-панели (без слешей)'],
      ['admin_email', '', 'admin', 'Email администратора'],
      ['maintenance_mode', 'false', 'system', 'Режим обслуживания'],
      ['enable_analytics', 'false', 'system', 'Включить аналитику'],
      ['cors_origin', '*', 'network', 'CORS origin'],
      ['rate_limit_window', '60000', 'network', 'Окно rate limit (мс)'],
      ['rate_limit_max', '100', 'network', 'Макс. запросов в окне'],
    ];

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO settings (key, value, category, description)
      VALUES (?, ?, ?, ?)
    `);

    for (const [key, value, category, description] of defaults) {
      stmt.run(key, value, category, description);
    }
  }

  // === Shares ===
  async createShare(share: Omit<ShareRecord, 'downloads' | 'created_at'>): Promise<ShareRecord> {
    const stmt = this.db.prepare(`
      INSERT INTO shares (id, type, file_name, file_size, mime_type, content, file_path, password_hash, max_downloads, expires_at)
      VALUES (@id, @type, @file_name, @file_size, @mime_type, @content, @file_path, @password_hash, @max_downloads, @expires_at)
    `);
    stmt.run(share);
    return (await this.findShareById(share.id))!;
  }

  async findShareById(id: string): Promise<ShareRecord | null> {
    const record = this.db.prepare('SELECT * FROM shares WHERE id = ?').get(id) as ShareRecord | undefined;
    if (!record) return null;
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      await this.deleteShare(id);
      return null;
    }
    return record;
  }

  async incrementShareDownloads(id: string): Promise<void> {
    this.db.prepare('UPDATE shares SET downloads = downloads + 1 WHERE id = ?').run(id);
  }

  async deleteShare(id: string): Promise<void> {
    const record = this.db.prepare('SELECT * FROM shares WHERE id = ?').get(id) as ShareRecord | undefined;
    if (record?.file_path && fs.existsSync(record.file_path)) {
      fs.unlinkSync(record.file_path);
    }
    this.db.prepare('DELETE FROM shares WHERE id = ?').run(id);
  }

  async listShares(options?: { limit?: number; offset?: number; type?: string }): Promise<ShareRecord[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    let query = 'SELECT * FROM shares';
    const params: any[] = [];

    if (options?.type) {
      query += ' WHERE type = ?';
      params.push(options.type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(query).all(...params) as ShareRecord[];
  }

  async cleanupExpired(): Promise<number> {
    const result = this.db.prepare(`
      DELETE FROM shares WHERE expires_at IS NOT NULL AND expires_at < datetime('now')
    `).run();
    return result.changes;
  }

  // === Settings ===
  async getSetting(key: string): Promise<string | null> {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string, category: string = 'general', description: string = ''): Promise<void> {
    this.db.prepare(`
      INSERT INTO settings (key, value, category, description, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, category = excluded.category, description = excluded.description, updated_at = datetime('now')
    `).run(key, value, category, description);
  }

  async getAllSettings(): Promise<SettingRecord[]> {
    return this.db.prepare('SELECT * FROM settings ORDER BY category, key').all() as SettingRecord[];
  }

  async getSettingsByCategory(category: string): Promise<SettingRecord[]> {
    return this.db.prepare('SELECT * FROM settings WHERE category = ? ORDER BY key').all(category) as SettingRecord[];
  }

  async deleteSetting(key: string): Promise<void> {
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }

  // === Admin ===
  async createAdmin(user: Omit<AdminUser, 'created_at' | 'last_login'>): Promise<AdminUser> {
    const id = user.id || require('crypto').randomUUID();
    this.db.prepare(`
      INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)
    `).run(id, user.username, user.password_hash);
    return (await this.findAdminById(id))!;
  }

  async findAdminByUsername(username: string): Promise<AdminUser | null> {
    return this.db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as AdminUser | null;
  }

  async findAdminById(id: string): Promise<AdminUser | null> {
    return this.db.prepare('SELECT * FROM admin_users WHERE id = ?').get(id) as AdminUser | null;
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    this.db.prepare("UPDATE admin_users SET last_login = datetime('now') WHERE id = ?").run(id);
  }

  async changeAdminPassword(id: string, newHash: string): Promise<void> {
    this.db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(newHash, id);
  }

  // === Stats ===
  async getStats(): Promise<DbStats> {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM shares').get() as { count: number };
    const downloads = this.db.prepare('SELECT COALESCE(SUM(downloads), 0) as total FROM shares').get() as { total: number };
    const active = this.db.prepare("SELECT COUNT(*) as count FROM shares WHERE expires_at IS NULL OR expires_at > datetime('now')").get() as { count: number };
    const expired = this.db.prepare("SELECT COUNT(*) as count FROM shares WHERE expires_at IS NOT NULL AND expires_at < datetime('now')").get() as { count: number };
    const storage = this.db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM shares WHERE type = "file"').get() as { total: number };

    return {
      totalShares: total.count,
      totalDownloads: downloads.total,
      activeShares: active.count,
      expiredShares: expired.count,
      totalStorage: storage.total,
      dbType: 'sqlite',
    };
  }
}
