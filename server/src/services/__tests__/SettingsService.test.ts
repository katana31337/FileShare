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
      mockDb.getSetting.mockResolvedValue('test-value');

      const value = await settingsService.get('test-key');

      expect(value).toBe('test-value');
      expect(mockDb.getSetting).toHaveBeenCalledWith('test-key');
    });

    it('должен возвращать null если настройка не найдена', async () => {
      mockDb.getSetting.mockResolvedValue(null);

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
      mockDb.getSetting.mockImplementation(async (key: string) => {
        const settings: Record<string, string> = {
          site_name: 'QuickShare',
          site_description: 'Anonymous file sharing',
          site_icon: '🔗',
          site_logo_url: '',
          primary_color: '#9333ea',
        };
        return settings[key] || null;
      });

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
      mockDb.getSetting.mockImplementation(async (key: string) => {
        const settings: Record<string, string> = {
          max_file_size: '104857600',
          max_text_length: '50000',
          default_expiry: '86400',
          max_downloads_default: '0',
        };
        return settings[key] || null;
      });

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
      mockDb.getSetting.mockImplementation(async (key: string) => {
        const settings: Record<string, string> = {
          allow_password: 'true',
          require_password: 'false',
          auto_delete_downloaded: 'false',
          enable_registration: 'false',
          enable_e2e_encryption: 'false',
        };
        return settings[key] || null;
      });

      const security = await settingsService.getSecurityConfig();

      expect(security).toBeDefined();
      expect(security.allowPassword).toBe(true);
      expect(security.requirePassword).toBe(false);
      expect(security.autoDeleteDownloaded).toBe(false);
      expect(security.enableRegistration).toBe(false);
      expect(security.enableE2EEncryption).toBe(false);
    });
  });
});
