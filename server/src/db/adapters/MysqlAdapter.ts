import {
  IDatabaseAdapter,
  ShareRecord,
  SettingRecord,
  AdminUser,
  DbStats,
} from './IDatabaseAdapter';

/**
 * MysqlAdapter — MySQL/MariaDB implementation.
 */
export class MysqlAdapter implements IDatabaseAdapter {
  private connection: any;
  private config: { host: string; port: number; database: string; username: string; password: string };

  constructor(config: { host: string; port: number; database: string; username: string; password: string }) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const mysql = require('mysql2/promise');
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
      });
      await this.initialize();
    } catch (e: any) {
      throw new Error(`MySQL connection failed: ${e.message}. Install 'mysql2' package.`);
    }
  }

  async disconnect(): Promise<void> {
    await this.connection?.end();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.connection.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async initialize(): Promise<void> {
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS shares (
        id VARCHAR(20) PRIMARY KEY,
        type ENUM('file', 'text') NOT NULL,
        file_name VARCHAR(500),
        file_size BIGINT,
        mime_type VARCHAR(200),
        content LONGTEXT,
        file_path VARCHAR(1000),
        password_hash VARCHAR(500),
        max_downloads INT,
        downloads INT DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        INDEX idx_expires (expires_at),
        INDEX idx_created (created_at)
      )
    `);

    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        description VARCHAR(500) DEFAULT '',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category)
      )
    `);

    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(500) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
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
      ['admin_panel_path', 'admin', 'admin', 'URL путь к админ-панели (без слешей)'],
      ['admin_email', '', 'admin', 'Email администратора'],
      ['maintenance_mode', 'false', 'system', 'Режим обслуживания'],
      ['enable_analytics', 'false', 'system', 'Включить аналитику'],
      ['cors_origin', '*', 'network', 'CORS origin'],
      ['rate_limit_window', '60000', 'network', 'Окно rate limit (мс)'],
      ['rate_limit_max', '100', 'network', 'Макс. запросов в окне'],
    ];

    for (const [key, value, category, description] of defaults) {
      await this.connection.query(
        `INSERT IGNORE INTO settings (\`key\`, value, category, description) VALUES (?, ?, ?, ?)`,
        [key, value, category, description]
      );
    }
  }

  async createShare(share: Omit<ShareRecord, 'downloads' | 'created_at'>): Promise<ShareRecord> {
    await this.connection.query(
      `INSERT INTO shares (id, type, file_name, file_size, mime_type, content, file_path, password_hash, max_downloads, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [share.id, share.type, share.file_name, share.file_size, share.mime_type, share.content, share.file_path, share.password_hash, share.max_downloads, share.expires_at]
    );
    return (await this.findShareById(share.id))!;
  }

  async findShareById(id: string): Promise<ShareRecord | null> {
    const [rows] = await this.connection.query('SELECT * FROM shares WHERE id = ?', [id]);
    const record = (rows as any[])[0] || null;
    if (record?.expires_at && new Date(record.expires_at) < new Date()) {
      await this.deleteShare(id);
      return null;
    }
    return record;
  }

  async incrementShareDownloads(id: string): Promise<void> {
    await this.connection.query('UPDATE shares SET downloads = downloads + 1 WHERE id = ?', [id]);
  }

  async deleteShare(id: string): Promise<void> {
    await this.connection.query('DELETE FROM shares WHERE id = ?', [id]);
  }

  async listShares(options?: { limit?: number; offset?: number; type?: string }): Promise<ShareRecord[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    let query = 'SELECT * FROM shares';
    const params: any[] = [];
    if (options?.type) { query += ' WHERE type = ?'; params.push(options.type); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await this.connection.query(query, params);
    return rows as ShareRecord[];
  }

  async cleanupExpired(): Promise<number> {
    const [result] = await this.connection.query("DELETE FROM shares WHERE expires_at IS NOT NULL AND expires_at < NOW()");
    return result.affectedRows || 0;
  }

  async getSetting(key: string): Promise<string | null> {
    const [rows] = await this.connection.query('SELECT value FROM settings WHERE `key` = ?', [key]);
    return (rows as any[])[0]?.value ?? null;
  }

  async setSetting(key: string, value: string, category: string = 'general', description: string = ''): Promise<void> {
    await this.connection.query(
      `INSERT INTO settings (\`key\`, value, category, description) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), category = VALUES(category), description = VALUES(description)`,
      [key, value, category, description]
    );
  }

  async getAllSettings(): Promise<SettingRecord[]> {
    const [rows] = await this.connection.query('SELECT * FROM settings ORDER BY category, \`key\`');
    return rows as SettingRecord[];
  }

  async getSettingsByCategory(category: string): Promise<SettingRecord[]> {
    const [rows] = await this.connection.query('SELECT * FROM settings WHERE category = ? ORDER BY `key`', [category]);
    return rows as SettingRecord[];
  }

  async deleteSetting(key: string): Promise<void> {
    await this.connection.query('DELETE FROM settings WHERE `key` = ?', [key]);
  }

  async createAdmin(user: Omit<AdminUser, 'created_at' | 'last_login'>): Promise<AdminUser> {
    const id = user.id || require('crypto').randomUUID();
    await this.connection.query('INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)', [id, user.username, user.password_hash]);
    return (await this.findAdminById(id))!;
  }

  async findAdminByUsername(username: string): Promise<AdminUser | null> {
    const [rows] = await this.connection.query('SELECT * FROM admin_users WHERE username = ?', [username]);
    return (rows as any[])[0] || null;
  }

  async findAdminById(id: string): Promise<AdminUser | null> {
    const [rows] = await this.connection.query('SELECT * FROM admin_users WHERE id = ?', [id]);
    return (rows as any[])[0] || null;
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await this.connection.query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [id]);
  }

  async changeAdminPassword(id: string, newHash: string): Promise<void> {
    await this.connection.query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [newHash, id]);
  }

  async getStats(): Promise<DbStats> {
    const [total] = await this.connection.query('SELECT COUNT(*) as count FROM shares');
    const [downloads] = await this.connection.query('SELECT COALESCE(SUM(downloads), 0) as total FROM shares');
    const [active] = await this.connection.query("SELECT COUNT(*) as count FROM shares WHERE expires_at IS NULL OR expires_at > NOW()");
    const [expired] = await this.connection.query("SELECT COUNT(*) as count FROM shares WHERE expires_at IS NOT NULL AND expires_at < NOW()");
    const [storage] = await this.connection.query('SELECT COALESCE(SUM(file_size), 0) as total FROM shares WHERE type = ?', ['file']);

    return {
      totalShares: (total as any[])[0].count,
      totalDownloads: (downloads as any[])[0].total,
      activeShares: (active as any[])[0].count,
      expiredShares: (expired as any[])[0].count,
      totalStorage: (storage as any[])[0].total,
      dbType: 'mysql',
    };
  }
}
