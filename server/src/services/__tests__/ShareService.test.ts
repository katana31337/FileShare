import { ShareService } from '../ShareService';
import { IDatabaseAdapter, ShareRecord } from '../../db/adapters/IDatabaseAdapter';

describe('ShareService', () => {
  let shareService: ShareService;
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

    shareService = new ShareService(mockDb);
  });

  describe('createShare', () => {
    it('должен создавать текстовый шар', async () => {
      const mockShare: ShareRecord = {
        id: 'test-id',
        type: 'text',
        content: 'test content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: null,
        max_downloads: null,
        downloads: 0,
        created_at: new Date().toISOString(),
        expires_at: null,
      };

      mockDb.createShare.mockResolvedValue(mockShare);

      const result = await shareService.createShare({
        type: 'text',
        content: 'test content',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id');
      expect(mockDb.createShare).toHaveBeenCalled();
    });

    it('должен создавать шар с паролем', async () => {
      const mockShare: ShareRecord = {
        id: 'test-id',
        type: 'text',
        content: 'encrypted content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: 'hashed-password',
        max_downloads: null,
        downloads: 0,
        created_at: new Date().toISOString(),
        expires_at: null,
      };

      mockDb.createShare.mockResolvedValue(mockShare);

      const result = await shareService.createShare({
        type: 'text',
        content: 'test content',
        password: 'secret123',
      });

      expect(result).toBeDefined();
      expect(mockDb.createShare).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: expect.any(String),
        })
      );
    });

    it('должен создавать шар с ограничением скачиваний', async () => {
      const mockShare: ShareRecord = {
        id: 'test-id',
        type: 'text',
        content: 'test content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: null,
        max_downloads: 5,
        downloads: 0,
        created_at: new Date().toISOString(),
        expires_at: null,
      };

      mockDb.createShare.mockResolvedValue(mockShare);

      const result = await shareService.createShare({
        type: 'text',
        content: 'test content',
        maxDownloads: 5,
      });

      expect(result).toBeDefined();
      expect(mockDb.createShare).toHaveBeenCalledWith(
        expect.objectContaining({
          max_downloads: 5,
        })
      );
    });

    it('должен создавать шар с временем жизни', async () => {
      const mockShare: ShareRecord = {
        id: 'test-id',
        type: 'text',
        content: 'test content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: null,
        max_downloads: null,
        downloads: 0,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      };

      mockDb.createShare.mockResolvedValue(mockShare);

      const result = await shareService.createShare({
        type: 'text',
        content: 'test content',
        expiresIn: 3600, // 1 hour in seconds
      });

      expect(result).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('getShareInfo', () => {
    it('должен возвращать информацию о шаре', async () => {
      const mockShare: ShareRecord = {
        id: 'test-id',
        type: 'text',
        content: 'test content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: null,
        max_downloads: null,
        downloads: 0,
        created_at: new Date().toISOString(),
        expires_at: null,
      };

      mockDb.findShareById.mockResolvedValue(mockShare);

      const result = await shareService.getShareInfo('test-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id');
      expect(result.type).toBe('text');
    });

    it('должен выбрасывать ошибку если шар не найден', async () => {
      mockDb.findShareById.mockResolvedValue(null);

      await expect(shareService.getShareInfo('nonexistent')).rejects.toThrow('Share not found');
    });

    it('должен выбрасывать ошибку если шар истёк', async () => {
      const expiredShare: ShareRecord = {
        id: 'test-id',
        type: 'text',
        content: 'test content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: null,
        max_downloads: null,
        downloads: 0,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        expires_at: new Date(Date.now() - 3600000).toISOString(), // expired 1 hour ago
      };

      mockDb.findShareById.mockResolvedValue(expiredShare);

      await expect(shareService.getShareInfo('test-id')).rejects.toThrow('expired');
    });
  });

  describe('downloadShare', () => {
    it('должен скачивать текстовый шар', async () => {
      const mockShare: ShareRecord = {
        id: 'test-id',
        type: 'text',
        content: 'test content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: null,
        max_downloads: null,
        downloads: 0,
        created_at: new Date().toISOString(),
        expires_at: null,
      };

      mockDb.findShareById.mockResolvedValue(mockShare);
      mockDb.incrementShareDownloads.mockResolvedValue(undefined);

      const result = await shareService.downloadShare('test-id');

      expect(result).toBeDefined();
      expect(result.info.id).toBe('test-id');
      expect(result.data).toBe('test content');
      expect(mockDb.incrementShareDownloads).toHaveBeenCalledWith('test-id');
    });

    it('должен проверять пароль если установлен', async () => {
      const password = 'secret123';
      const hash = require('crypto').randomBytes(16).toString('hex') + ':' + 
                   require('crypto').pbkdf2Sync(password, require('crypto').randomBytes(16).toString('hex'), 10000, 64, 'sha512').toString('hex');

      const mockShare: ShareRecord = {
        id: 'test-id',
        type: 'text',
        content: 'encrypted content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: hash,
        max_downloads: null,
        downloads: 0,
        created_at: new Date().toISOString(),
        expires_at: null,
      };

      mockDb.findShareById.mockResolvedValue(mockShare);

      await expect(shareService.downloadShare('test-id', 'wrong-password')).rejects.toThrow('Invalid password');
    });

    it('должен выбрасывать ошибку если достигнут лимит скачиваний', async () => {
      const mockShare: ShareRecord = {
        id: 'test-id',
        type: 'text',
        content: 'test content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: null,
        max_downloads: 5,
        downloads: 5,
        created_at: new Date().toISOString(),
        expires_at: null,
      };

      mockDb.findShareById.mockResolvedValue(mockShare);

      await expect(shareService.downloadShare('test-id')).rejects.toThrow('download limit');
    });
  });

  describe('deleteShare', () => {
    it('должен удалять шар', async () => {
      mockDb.deleteShare.mockResolvedValue(undefined);

      await shareService.deleteShare('test-id');

      expect(mockDb.deleteShare).toHaveBeenCalledWith('test-id');
    });
  });

  describe('listShares', () => {
    it('должен возвращать список шаров', async () => {
      const mockShares: ShareRecord[] = [
        {
          id: 'test-id-1',
          type: 'text',
          content: 'content 1',
          file_name: null,
          file_size: null,
          mime_type: null,
          file_path: null,
          password_hash: null,
          max_downloads: null,
          downloads: 0,
          created_at: new Date().toISOString(),
          expires_at: null,
        },
        {
          id: 'test-id-2',
          type: 'file',
          content: null,
          file_name: 'test.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          file_path: '/path/to/file',
          password_hash: null,
          max_downloads: null,
          downloads: 0,
          created_at: new Date().toISOString(),
          expires_at: null,
        },
      ];

      mockDb.listShares.mockResolvedValue(mockShares);

      const result = await shareService.listShares();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('test-id-1');
      expect(result[1].id).toBe('test-id-2');
    });

    it('должен поддерживать фильтрацию по типу', async () => {
      const mockShares: ShareRecord[] = [
        {
          id: 'test-id-1',
          type: 'text',
          content: 'content 1',
          file_name: null,
          file_size: null,
          mime_type: null,
          file_path: null,
          password_hash: null,
          max_downloads: null,
          downloads: 0,
          created_at: new Date().toISOString(),
          expires_at: null,
        },
      ];

      mockDb.listShares.mockResolvedValue(mockShares);

      const result = await shareService.listShares({ type: 'text' });

      expect(mockDb.listShares).toHaveBeenCalledWith(expect.objectContaining({ type: 'text' }));
    });
  });

  describe('cleanupExpired', () => {
    it('должен удалять истёкшие шары', async () => {
      mockDb.cleanupExpired.mockResolvedValue(5);

      const deleted = await shareService.cleanupExpired();

      expect(deleted).toBe(5);
      expect(mockDb.cleanupExpired).toHaveBeenCalled();
    });
  });
});
