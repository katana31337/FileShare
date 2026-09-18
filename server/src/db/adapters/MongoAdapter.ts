import {
  IDatabaseAdapter,
  ShareRecord,
  SettingRecord,
  AdminUser,
  DbStats,
} from './IDatabaseAdapter';

/**
 * MongoAdapter — MongoDB implementation.
 * Uses 'mongodb' native driver.
 */
export class MongoAdapter implements IDatabaseAdapter {
  private client: any;
  private db: any;
  private mongoUri: string;

  constructor(mongoUri: string) {
    this.mongoUri = mongoUri;
  }

  async connect(): Promise<void> {
    try {
      const { MongoClient } = require('mongodb');
      this.client = new MongoClient(this.mongoUri);
      await this.client.connect();
      this.db = this.client.db();
      await this.initialize();
    } catch (e: any) {
      throw new Error(`MongoDB connection failed: ${e.message}. Install 'mongodb' package.`);
    }
  }

  async disconnect(): Promise<void> {
    await this.client?.close();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }

  private async initialize(): Promise<void> {
    // Create indexes
    await this.db.collection('shares').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
    await this.db.collection('shares').createIndex({ created_at: -1 });
    await this.db.collection('settings').createIndex({ category: 1 });
    await this.db.collection('admin_users').createIndex({ username: 1 }, { unique: true });

    await this.insertDefaultSettings();
  }

  private async insertDefaultSettings(): Promise<void> {
    const defaults = [
      { key: 'site_name', value: 'QuickShare', category: 'general', description: 'Название сервиса' },
      { key: 'site_description', value: 'Анонимный обмен файлами и текстом', category: 'general', description: 'Описание сервиса' },
      { key: 'site_icon', value: '🔗', category: 'general', description: 'Иконка сервиса (emoji)' },
      { key: 'site_logo_url', value: '', category: 'general', description: 'URL логотипа' },
      { key: 'primary_color', value: '#9333ea', category: 'general', description: 'Основной цвет темы' },
      { key: 'max_file_size', value: '104857600', category: 'limits', description: 'Макс. размер файла (байт)' },
      { key: 'max_text_length', value: '50000', category: 'limits', description: 'Макс. длина текста' },
      { key: 'default_expiry', value: '86400', category: 'limits', description: 'Срок жизни по умолчанию (сек)' },
      { key: 'max_downloads_default', value: '0', category: 'limits', description: 'Лимит скачиваний по умолчанию' },
      { key: 'allow_password', value: 'true', category: 'security', description: 'Разрешить пароли' },
      { key: 'require_password', value: 'false', category: 'security', description: 'Требовать пароль всегда' },
      { key: 'auto_delete_downloaded', value: 'false', category: 'security', description: 'Удалять после скачивания' },
      { key: 'enable_registration', value: 'false', category: 'security', description: 'Разрешить регистрацию' },
      { key: 'enable_e2e_encryption', value: 'false', category: 'security', description: 'Включить end-to-end шифрование' },
      { key: 'history_retention_days', value: '30', category: 'system', description: 'Срок хранения истории (в днях, 0 = бессрочно)' },
      { key: 'admin_panel_path', value: 'admin', category: 'admin', description: 'URL путь к админ-панели (без слешей)' },
      { key: 'admin_email', value: '', category: 'admin', description: 'Email администратора' },
      { key: 'maintenance_mode', value: 'false', category: 'system', description: 'Режим обслуживания' },
      { key: 'enable_analytics', value: 'false', category: 'system', description: 'Включить аналитику' },
      { key: 'cors_origin', value: '*', category: 'network', description: 'CORS origin' },
      { key: 'rate_limit_window', value: '60000', category: 'network', description: 'Окно rate limit (мс)' },
      { key: 'rate_limit_max', value: '100', category: 'network', description: 'Макс. запросов в окне' },
    ];

    const col = this.db.collection('settings');
    for (const setting of defaults) {
      await col.updateOne(
        { key: setting.key },
        { $setOnInsert: { ...setting, updated_at: new Date().toISOString() } },
        { upsert: true }
      );
    }
  }

  private toShareRecord(doc: any): ShareRecord {
    return {
      id: doc._id || doc.id,
      type: doc.type,
      file_name: doc.file_name,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      content: doc.content,
      file_path: doc.file_path,
      password_hash: doc.password_hash,
      max_downloads: doc.max_downloads,
      downloads: doc.downloads || 0,
      created_at: doc.created_at,
      expires_at: doc.expires_at,
    };
  }

  async createShare(share: Omit<ShareRecord, 'downloads' | 'created_at'>): Promise<ShareRecord> {
    const doc = {
      _id: share.id,
      ...share,
      downloads: 0,
      created_at: new Date().toISOString(),
    };
    await this.db.collection('shares').insertOne(doc);
    return this.toShareRecord(doc);
  }

  async findShareById(id: string): Promise<ShareRecord | null> {
    const doc = await this.db.collection('shares').findOne({ _id: id });
    if (!doc) return null;
    const record = this.toShareRecord(doc);
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      await this.deleteShare(id);
      return null;
    }
    return record;
  }

  async incrementShareDownloads(id: string): Promise<void> {
    await this.db.collection('shares').updateOne({ _id: id }, { $inc: { downloads: 1 } });
  }

  async deleteShare(id: string): Promise<void> {
    await this.db.collection('shares').deleteOne({ _id: id });
  }

  async listShares(options?: { limit?: number; offset?: number; type?: string }): Promise<ShareRecord[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const filter: any = {};
    if (options?.type) filter.type = options.type;

    const docs = await this.db.collection('shares')
      .find(filter)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    return docs.map(this.toShareRecord);
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.db.collection('shares').deleteMany({
      expires_at: { $ne: null, $lt: new Date().toISOString() }
    });
    return result.deletedCount || 0;
  }

  async getSetting(key: string): Promise<string | null> {
    const doc = await this.db.collection('settings').findOne({ key });
    return doc?.value ?? null;
  }

  async setSetting(key: string, value: string, category: string = 'general', description: string = ''): Promise<void> {
    await this.db.collection('settings').updateOne(
      { key },
      { $set: { value, category, description, updated_at: new Date().toISOString() } },
      { upsert: true }
    );
  }

  async getAllSettings(): Promise<SettingRecord[]> {
    const docs = await this.db.collection('settings').find({}).sort({ category: 1, key: 1 }).toArray();
    return docs.map((d: any) => ({ key: d.key, value: d.value, category: d.category, description: d.description, updated_at: d.updated_at }));
  }

  async getSettingsByCategory(category: string): Promise<SettingRecord[]> {
    const docs = await this.db.collection('settings').find({ category }).sort({ key: 1 }).toArray();
    return docs.map((d: any) => ({ key: d.key, value: d.value, category: d.category, description: d.description, updated_at: d.updated_at }));
  }

  async deleteSetting(key: string): Promise<void> {
    await this.db.collection('settings').deleteOne({ key });
  }

  async createAdmin(user: Omit<AdminUser, 'created_at' | 'last_login'>): Promise<AdminUser> {
    const id = user.id || require('crypto').randomUUID();
    const doc = { _id: id, username: user.username, password_hash: user.password_hash, created_at: new Date().toISOString(), last_login: null };
    await this.db.collection('admin_users').insertOne(doc);
    return { id: doc._id, username: doc.username, password_hash: doc.password_hash, created_at: doc.created_at, last_login: doc.last_login };
  }

  async findAdminByUsername(username: string): Promise<AdminUser | null> {
    const doc = await this.db.collection('admin_users').findOne({ username });
    if (!doc) return null;
    return { id: doc._id, username: doc.username, password_hash: doc.password_hash, created_at: doc.created_at, last_login: doc.last_login };
  }

  async findAdminById(id: string): Promise<AdminUser | null> {
    const doc = await this.db.collection('admin_users').findOne({ _id: id });
    if (!doc) return null;
    return { id: doc._id, username: doc.username, password_hash: doc.password_hash, created_at: doc.created_at, last_login: doc.last_login };
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await this.db.collection('admin_users').updateOne({ _id: id }, { $set: { last_login: new Date().toISOString() } });
  }

  async changeAdminPassword(id: string, newHash: string): Promise<void> {
    await this.db.collection('admin_users').updateOne({ _id: id }, { $set: { password_hash: newHash } });
  }

  async getStats(): Promise<DbStats> {
    const totalShares = await this.db.collection('shares').countDocuments();
    const activeShares = await this.db.collection('shares').countDocuments({
      $or: [{ expires_at: null }, { expires_at: { $gt: new Date().toISOString() } }]
    });
    const expiredShares = await this.db.collection('shares').countDocuments({
      expires_at: { $ne: null, $lt: new Date().toISOString() }
    });

    const downloadAgg = await this.db.collection('shares').aggregate([
      { $group: { _id: null, total: { $sum: '$downloads' } } }
    ]).toArray();
    const totalDownloads = downloadAgg[0]?.total || 0;

    const storageAgg = await this.db.collection('shares').aggregate([
      { $match: { type: 'file' } },
      { $group: { _id: null, total: { $sum: '$file_size' } } }
    ]).toArray();
    const totalStorage = storageAgg[0]?.total || 0;

    return { totalShares, totalDownloads, activeShares, expiredShares, totalStorage, dbType: 'mongodb' };
  }
}
