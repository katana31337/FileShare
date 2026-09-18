import { SettingsService } from '../SettingsService';
import { IDatabaseAdapter, SettingRecord } from '../../db/adapters/IDatabaseAdapter';

describe('SettingsService', () => {
  let settingsService: SettingsService;
  let mockDb: jest.Mocked<IDatabaseAdapter>;

  beforeEach(() => {
    mockDb = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isHealthy: jest.fn(),
      createShare: jest.fn(),
      findShareById: jest.fn(),
      incrementShareDownloads: jest.fn(),
      deleteShare: jest.fn(),
      listShares: jest.fn(),
      cleanupExpired: jest.fn(),
      getSetting: jest.fn(),
      setSetting: jest.fn(),
      getAllSettings: jest.fn(),
      getSettingsByCategory: jest.fn(),
      deleteSetting: jest.fn(),
      createAdmin: jest.fn(),
      findAdminByUsername: jest.fn(),
      findAdminById: jest.fn(),
      updateAdminLastLogin: jest.fn(),
      changeAdminPassword: jest.fn(),
      getStats: jest.fn(),
    };

    settingsService = new SettingsService(mockDb);
  });

  describe('get', () => {
    it('должен возвращать значение настройки', async () => {
      // Добавляем значение в кэш через getAllSettings
      mockDb.getAllSettings.mockResolvedValue([
        { key: 'test-key', value: 'test-value', category: 'general', description: 'Test', updated_at: new Date().toISOString() }
      ]);

      const value = await settingsService.get('test-key');

      expect(value).toBe('test-value');
    });

    it('должен возвращать null если настройка не найдена', async () => {
      mockDb.getAllSettings.mockResolvedValue([]);

      const value = await settingsService.get('nonexistent');

      expect(value).toBeNull();
    });
  });

  describe('set', () => {
    it('должен сохранять настройку', async () => {
      mockDb.setSetting.mockResolvedValue(undefined);

      await settingsService.set('test-key', 'test-value', 'general', 'Test description');

      expect(mockDb.setSetting).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        'general',
        'Test description'
      );
    });
  });

  describe('getAll', () => {
    it('должен возвращать все настройки', async () => {
      const mockSettings: SettingRecord[] = [
        {
          key: 'site_name',
          value: 'QuickShare',
          category: 'general',
          description: 'Site name',
          updated_at: new Date().toISOString(),
        },
        {
          key: 'max_file_size',
          value: '104857600',
          category: 'limits',
          description: 'Max file size',
          updated_at: new Date().toISOString(),
        },
      ];

      mockDb.getAllSettings.mockResolvedValue(mockSettings);

      const settings = await settingsService.getAll();

      expect(settings).toHaveLength(2);
      expect(settings[0].key).toBe('site_name');
      expect(settings[1].key).toBe('max_file_size');
    });
  });

  describe('getByCategory', () => {
    it('должен возвращать настройки по категории', async () => {
      const mockSettings: SettingRecord[] = [
        {
          key: 'site_name',
          value: 'QuickShare',
          category: 'general',
          description: 'Site name',
          updated_at: new Date().toISOString(),
        },
      ];

      mockDb.getSettingsByCategory.mockResolvedValue(mockSettings);

      const settings = await settingsService.getByCategory('general');

      expect(settings).toHaveLength(1);
      expect(settings[0].category).toBe('general');
      expect(mockDb.getSettingsByCategory).toHaveBeenCalledWith('general');
    });
  });

  describe('delete', () => {
    it('должен удалять настройку', async () => {
      mockDb.deleteSetting.mockResolvedValue(undefined);

      await settingsService.delete('test-key');

      expect(mockDb.deleteSetting).toHaveBeenCalledWith('test-key');
    });
  });

  describe('getSiteConfig', () => {
    it('должен возвращать конфигурацию сайта', async () => {
      // Добавляем значения в кэш через getAllSettings
      mockDb.getAllSettings.mockResolvedValue([
        { key: 'site_name', value: 'QuickShare', category: 'general', description: 'Site name', updated_at: new Date().toISOString() },
        { key: 'site_description', value: 'Anonymous file sharing', category: 'general', description: 'Site description', updated_at: new Date().toISOString() },
        { key: 'site_icon', value: '🔗', category: 'general', description: 'Site icon', updated_at: new Date().toISOString() },
        { key: 'site_logo_url', value: '', category: 'general', description: 'Site logo', updated_at: new Date().toISOString() },
        { key: 'primary_color', value: '#9333ea', category: 'general', description: 'Primary color', updated_at: new Date().toISOString() },
      ]);

      const config = await settingsService.getSiteConfig();

      expect(config).toBeDefined();
      expect(config.name).toBe('QuickShare');
      expect(config.description).toBe('Anonymous file sharing');
      expect(config.icon).toBe('🔗');
      expect(config.primaryColor).toBe('#9333ea');
    });
  });

  describe('getLimits', () => {
    it('должен возвращать лимиты', async () => {
      // Добавляем значения в кэш через getAllSettings
      mockDb.getAllSettings.mockResolvedValue([
        { key: 'max_file_size', value: '104857600', category: 'limits', description: 'Max file size', updated_at: new Date().toISOString() },
        { key: 'max_text_length', value: '50000', category: 'limits', description: 'Max text length', updated_at: new Date().toISOString() },
        { key: 'default_expiry', value: '86400', category: 'limits', description: 'Default expiry', updated_at: new Date().toISOString() },
        { key: 'max_downloads_default', value: '0', category: 'limits', description: 'Max downloads default', updated_at: new Date().toISOString() },
      ]);

      const limits = await settingsService.getLimits();

      expect(limits).toBeDefined();
      expect(limits.maxFileSize).toBe(104857600);
      expect(limits.maxTextLength).toBe(50000);
      expect(limits.defaultExpiry).toBe(86400);
      expect(limits.maxDownloadsDefault).toBe(0);
    });
  });

  describe('getSecurityConfig', () => {
    it('должен возвращать конфигурацию безопасности', async () => {
      // Добавляем значения в кэш через getAllSettings
      mockDb.getAllSettings.mockResolvedValue([
        { key: 'allow_password', value: 'true', category: 'security', description: 'Allow password', updated_at: new Date().toISOString() },
        { key: 'require_password', value: 'false', category: 'security', description: 'Require password', updated_at: new Date().toISOString() },
        { key: 'auto_delete_downloaded', value: 'false', category: 'security', description: 'Auto delete downloaded', updated_at: new Date().toISOString() },
        { key: 'enable_registration', value: 'false', category: 'security', description: 'Enable registration', updated_at: new Date().toISOString() },
        { key: 'enable_e2e_encryption', value: 'false', category: 'security', description: 'Enable E2E encryption', updated_at: new Date().toISOString() },
      ]);

      const security = await settingsService.getSecurityConfig();

      expect(security).toBeDefined();
      expect(security.allowPassword).toBe(true);
      expect(security.requirePassword).toBe(false);
      expect(security.autoDeleteDownloaded).toBe(false);
      expect(security.enableRegistration).toBe(false);
      expect(security.enableE2EEncryption).toBe(false);
    });
  });

  describe('getSystemConfig', () => {
    it('должен возвращать конфигурацию системы', async () => {
      // Добавляем значения в кэш через getAllSettings
      mockDb.getAllSettings.mockResolvedValue([
        { key: 'maintenance_mode', value: 'false', category: 'system', description: 'Maintenance mode', updated_at: new Date().toISOString() },
        { key: 'enable_analytics', value: 'false', category: 'system', description: 'Enable analytics', updated_at: new Date().toISOString() },
        { key: 'history_retention_days', value: '30', category: 'system', description: 'History retention days', updated_at: new Date().toISOString() },
      ]);

      const config = await settingsService.getSystemConfig();

      expect(config).toBeDefined();
      expect(config.maintenanceMode).toBe(false);
      expect(config.enableAnalytics).toBe(false);
      expect(config.historyRetentionDays).toBe(30);
    });

    it('должен возвращать значение по умолчанию для historyRetentionDays', async () => {
      mockDb.getAllSettings.mockResolvedValue([]);

      const config = await settingsService.getSystemConfig();

      expect(config.historyRetentionDays).toBe(30);
    });

    it('должен обрабатывать значение 0 для бессрочного хранения', async () => {
      // Добавляем значение 0 в кэш через getAllSettings
      mockDb.getAllSettings.mockResolvedValue([
        { key: 'history_retention_days', value: '0', category: 'system', description: 'History retention', updated_at: new Date().toISOString() },
      ]);

      const config = await settingsService.getSystemConfig();

      expect(config.historyRetentionDays).toBe(0);
    });
  });
});
