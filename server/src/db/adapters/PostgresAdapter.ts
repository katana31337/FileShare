import {
  IDatabaseAdapter,
  ShareRecord,
  SettingRecord,
  AdminUser,
  DbStats,
} from './IDatabaseAdapter';

/**
 * PostgresAdapter — PostgreSQL implementation.
 * Uses 'pg' package. Falls back gracefully if not installed.
 */
export class PostgresAdapter implements IDatabaseAdapter {
  private pool: any;
  private config: { host: string; port: number; database: string; username: string; password: string };

  constructor(config: { host: string; port: number; database: string; username: string; password: string }) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const { Pool } = require('pg');
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
      });
      await this.initialize();
    } catch (e: any) {
      throw new Error(`PostgreSQL connection failed: ${e.message}. Install 'pg' package.`);
    }
  }

  async disconnect(): Promise<void> {
    await this.pool?.end();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('file', 'text')),
        file_name TEXT,
        file_size BIGINT,
        mime_type TEXT,
        content TEXT,
        file_path TEXT,
        password_hash TEXT,
        max_downloads INTEGER,
        downloads INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        description TEXT DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_shares_expires ON shares(expires_at);
      CREATE INDEX IF NOT EXISTS idx_shares_created ON shares(created_at);
      CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
    `);

    await this.insertDefaultSettings();
  }

  private async insertDefaultSettings(): Promise<void> {
    const defaults: Array<[string, string, string, string]> = [
      ['site_name', 'QuickShare', 'general', 'Название сервиса'],
      ['site_description', 'Анонимный обмен файлами и текстом', 'general', 'Описание сервиса'],
      ['site_icon', '🔗', 'general', 'Иконка сервиса (emoji)'],
      ['site_logo_url', '', 'general', 'URL логотипа'],
      ['primary_color', '#9333ea', 'general', 'Основной цвет темы'],
      ['max_file_size', '104857600', 'limits', 'Макс. размер файла (байт)'],
      ['max_text_length', '50000', 'limits', 'Макс. длина текста'],
      ['default_expiry', '86400', 'limits', 'Срок жизни по умолчанию (сек)'],
      ['max_downloads_default', '0', 'limits', 'Лимит скачиваний по умолчанию'],
      ['allow_password', 'true', 'security', 'Разрешить пароли'],
      ['require_password', 'false', 'security', 'Требовать пароль всегда'],
      ['auto_delete_downloaded', 'false', 'security', 'Удалять после скачивания'],
      ['enable_registration', 'false', 'security', 'Разрешить регистрацию'],
      ['enable_e2e_encryption', 'false', 'security', 'Включить end-to-end шифрование'],
      ['history_retention_days', '30', 'system', 'Срок хранения истории (в днях, 0 = бессрочно)'],
      ['admin_panel_path', 'admin', 'admin', 'URL путь к админ-панели (без слешей)'],
      ['admin_email', '', 'admin', 'Email администратора'],
      ['maintenance_mode', 'false', 'system', 'Режим обслуживания'],
      ['enable_analytics', 'false', 'system', 'Включить аналитику'],
      ['cors_origin', '*', 'network', 'CORS origin'],
      ['rate_limit_window', '60000', 'network', 'Окно rate limit (мс)'],
      ['rate_limit_max', '100', 'network', 'Макс. запросов в окне'],
    ];

    console.log(`📝 Inserting ${defaults.length} default settings...`);
    
    for (const [key, value, category, description] of defaults) {
      try {
        await this.pool.query(
          `INSERT INTO settings (key, value, category, description) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING`,
          [key, value, category, description]
        );
      } catch (error: any) {
        console.error(`❌ Error inserting setting ${key}:`, error.message);
      }
    }
    
    // Verify settings were inserted
    const result = await this.pool.query('SELECT COUNT(*) as count FROM settings');
    console.log(`✅ Total settings in database: ${result.rows[0].count}`);
  }

  async createShare(share: Omit<ShareRecord, 'downloads' | 'created_at'>): Promise<ShareRecord> {
    const result = await this.pool.query(
      `INSERT INTO shares (id, type, file_name, file_size, mime_type, content, file_path, password_hash, max_downloads, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [share.id, share.type, share.file_name, share.file_size, share.mime_type, share.content, share.file_path, share.password_hash, share.max_downloads, share.expires_at]
    );
    return result.rows[0];
  }

  async findShareById(id: string): Promise<ShareRecord | null> {
    const result = await this.pool.query('SELECT * FROM shares WHERE id = $1', [id]);
    const record = result.rows[0] || null;
    if (record?.expires_at && new Date(record.expires_at) < new Date()) {
      await this.deleteShare(id);
      return null;
    }
    return record;
  }

  async incrementShareDownloads(id: string): Promise<void> {
    await this.pool.query('UPDATE shares SET downloads = downloads + 1 WHERE id = $1', [id]);
  }

  async deleteShare(id: string): Promise<void> {
    await this.pool.query('DELETE FROM shares WHERE id = $1', [id]);
  }

  async listShares(options?: { limit?: number; offset?: number; type?: string }): Promise<ShareRecord[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    let query = 'SELECT * FROM shares';
    const params: any[] = [];

    if (options?.type) {
      query += ' WHERE type = $1';
      params.push(options.type);
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.pool.query("DELETE FROM shares WHERE expires_at IS NOT NULL AND expires_at < NOW()");
    return result.rowCount || 0;
  }

  async getSetting(key: string): Promise<string | null> {
    const result = await this.pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return result.rows[0]?.value ?? null;
  }

  async setSetting(key: string, value: string, category: string = 'general', description: string = ''): Promise<void> {
    await this.pool.query(
      `INSERT INTO settings (key, value, category, description, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, category = $3, description = $4, updated_at = NOW()`,
      [key, value, category, description]
    );
  }

  async getAllSettings(): Promise<SettingRecord[]> {
    const result = await this.pool.query('SELECT * FROM settings ORDER BY category, key');
    return result.rows;
  }

  async getSettingsByCategory(category: string): Promise<SettingRecord[]> {
    const result = await this.pool.query('SELECT * FROM settings WHERE category = $1 ORDER BY key', [category]);
    return result.rows;
  }

  async deleteSetting(key: string): Promise<void> {
    await this.pool.query('DELETE FROM settings WHERE key = $1', [key]);
  }

  async createAdmin(user: Omit<AdminUser, 'created_at' | 'last_login'>): Promise<AdminUser> {
    const id = user.id || require('crypto').randomUUID();
    const result = await this.pool.query(
      'INSERT INTO admin_users (id, username, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [id, user.username, user.password_hash]
    );
    return result.rows[0];
  }

  async findAdminByUsername(username: string): Promise<AdminUser | null> {
    const result = await this.pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    return result.rows[0] || null;
  }

  async findAdminById(id: string): Promise<AdminUser | null> {
    const result = await this.pool.query('SELECT * FROM admin_users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await this.pool.query("UPDATE admin_users SET last_login = NOW() WHERE id = $1", [id]);
  }

  async changeAdminPassword(id: string, newHash: string): Promise<void> {
    await this.pool.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [newHash, id]);
  }

  async getStats(): Promise<DbStats> {
    const total = await this.pool.query('SELECT COUNT(*) as count FROM shares');
    const downloads = await this.pool.query('SELECT COALESCE(SUM(downloads), 0) as total FROM shares');
    const active = await this.pool.query("SELECT COUNT(*) as count FROM shares WHERE expires_at IS NULL OR expires_at > NOW()");
    const expired = await this.pool.query("SELECT COUNT(*) as count FROM shares WHERE expires_at IS NOT NULL AND expires_at < NOW()");
    const storage = await this.pool.query('SELECT COALESCE(SUM(file_size), 0) as total FROM shares WHERE type = $1', ['file']);

    return {
      totalShares: parseInt(total.rows[0].count),
      totalDownloads: parseInt(downloads.rows[0].total),
      activeShares: parseInt(active.rows[0].count),
      expiredShares: parseInt(expired.rows[0].count),
      totalStorage: parseInt(storage.rows[0].total),
      dbType: 'postgres',
    };
  }
}
