import { IDatabaseAdapter, SettingRecord } from '../db/adapters/IDatabaseAdapter';

/**
 * SettingsService — Manages application settings stored in the database.
 * Single Responsibility: settings CRUD operations.
 * Caches settings in memory for performance.
 */
export class SettingsService {
  private db: IDatabaseAdapter;
  private cache: Map<string, string> = new Map();
  private cacheLoaded: boolean = false;

  constructor(db: IDatabaseAdapter) {
    this.db = db;
  }

  async loadCache(): Promise<void> {
    const settings = await this.db.getAllSettings();
    this.cache.clear();
    for (const setting of settings) {
      this.cache.set(setting.key, setting.value);
    }
    this.cacheLoaded = true;
  }

  async get(key: string): Promise<string | null> {
    if (!this.cacheLoaded) await this.loadCache();
    return this.cache.get(key) ?? null;
  }

  async getOrDefault(key: string, defaultValue: string): Promise<string> {
    const value = await this.get(key);
    return value ?? defaultValue;
  }

  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.get(key);
    return value ? parseInt(value) : defaultValue;
  }

  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) return defaultValue;
    return value === 'true' || value === '1';
  }

  async set(key: string, value: string, category?: string, description?: string): Promise<void> {
    await this.db.setSetting(key, value, category, description);
    this.cache.set(key, value);
  }

  async setMany(settings: Array<{ key: string; value: string; category?: string }>): Promise<void> {
    for (const s of settings) {
      await this.db.setSetting(s.key, s.value, s.category);
      this.cache.set(s.key, s.value);
    }
  }

  async getAll(): Promise<SettingRecord[]> {
    return this.db.getAllSettings();
  }

  async getByCategory(category: string): Promise<SettingRecord[]> {
    return this.db.getSettingsByCategory(category);
  }

  async delete(key: string): Promise<void> {
    await this.db.deleteSetting(key);
    this.cache.delete(key);
  }

  async getSiteConfig(): Promise<{
    name: string;
    description: string;
    icon: string;
    logoUrl: string;
    primaryColor: string;
  }> {
    return {
      name: await this.getOrDefault('site_name', 'QuickShare'),
      description: await this.getOrDefault('site_description', 'Анонимный обмен файлами'),
      icon: await this.getOrDefault('site_icon', '🔗'),
      logoUrl: await this.getOrDefault('site_logo_url', ''),
      primaryColor: await this.getOrDefault('primary_color', '#9333ea'),
    };
  }

  async getLimits(): Promise<{
    maxFileSize: number;
    maxTextLength: number;
    defaultExpiry: number;
    maxDownloadsDefault: number;
  }> {
    return {
      maxFileSize: await this.getNumber('max_file_size', 104857600),
      maxTextLength: await this.getNumber('max_text_length', 50000),
      defaultExpiry: await this.getNumber('default_expiry', 86400),
      maxDownloadsDefault: await this.getNumber('max_downloads_default', 0),
    };
  }

  async getSecurityConfig(): Promise<{
    allowPassword: boolean;
    requirePassword: boolean;
    autoDeleteDownloaded: boolean;
    enableRegistration: boolean;
    enableE2EEncryption: boolean;
  }> {
    return {
      allowPassword: await this.getBoolean('allow_password', true),
      requirePassword: await this.getBoolean('require_password', false),
      autoDeleteDownloaded: await this.getBoolean('auto_delete_downloaded', false),
      enableRegistration: await this.getBoolean('enable_registration', false),
      enableE2EEncryption: await this.getBoolean('enable_e2e_encryption', false),
    };
  }

  invalidateCache(): void {
    this.cacheLoaded = false;
    this.cache.clear();
  }
}

export default SettingsService;
