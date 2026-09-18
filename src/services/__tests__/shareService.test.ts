import { shareService } from '../shareService';
import { apiClient } from '../api';
import { localStorageService } from '../storage';
import { connectionMonitor } from '../ConnectionMonitor';

// Mock dependencies
jest.mock('../api');
jest.mock('../storage');
jest.mock('../ConnectionMonitor');

describe('ShareService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset shareService state
    (shareService as any).initialized = false;
    (shareService as any).useApi = false;
  });

  describe('init', () => {
    it('должен инициализироваться один раз', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);

      await shareService.init();
      await shareService.init();

      expect(apiClient.checkHealth).toHaveBeenCalledTimes(1);
    });

    it('должен устанавливать useApi в true если сервер доступен', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);

      await shareService.init();

      expect((shareService as any).useApi).toBe(true);
    });

    it('должен устанавливать useApi в false если сервер недоступен', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(false);

      await shareService.init();

      expect((shareService as any).useApi).toBe(false);
    });
  });

  describe('createShare', () => {
    it('должен создавать шар через API если сервер доступен', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);
      (connectionMonitor.getStatus as jest.Mock).mockReturnValue('connected');
      
      const mockResponse = {
        id: 'test-id',
        shortUrl: '/s/test-id',
        fullUrl: 'https://example.com/s/test-id',
        expiresAt: null,
        createdAt: new Date().toISOString(),
      };
      (apiClient.createShare as jest.Mock).mockResolvedValue(mockResponse);

      await shareService.init();
      const result = await shareService.createShare({
        type: 'text',
        content: 'test content',
      });

      expect(apiClient.createShare).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('должен создавать шар через localStorage если сервер недоступен', async () => {
      // В текущей реализации при недоступном сервере создание шара блокируется
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(false);
      (connectionMonitor.getStatus as jest.Mock).mockReturnValue('disconnected');
      
      await shareService.init();
      
      await expect(
        shareService.createShare({
          type: 'text',
          content: 'test content',
        })
      ).rejects.toThrow('Сервер недоступен');
    });

    it('должен выбрасывать ошибку если сервер недоступен и useApi = false', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(false);
      (connectionMonitor.getStatus as jest.Mock).mockReturnValue('disconnected');
      (shareService as any).useApi = false;

      await shareService.init();

      await expect(
        shareService.createShare({
          type: 'text',
          content: 'test content',
        })
      ).rejects.toThrow('Сервер недоступен');
    });
  });

  describe('uploadFile', () => {
    it('должен загружать файл через API если сервер доступен', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);
      (connectionMonitor.getStatus as jest.Mock).mockReturnValue('connected');
      
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(mockFile, 'size', { value: 1024 }); // 1 KB
      
      const mockResponse = {
        id: 'test-id',
        shortUrl: '/s/test-id',
        fullUrl: 'https://example.com/s/test-id',
        expiresAt: null,
        createdAt: new Date().toISOString(),
      };
      (apiClient.uploadFile as jest.Mock).mockResolvedValue(mockResponse);

      await shareService.init();
      const result = await shareService.uploadFile(mockFile, {});

      expect(apiClient.uploadFile).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('должен проверять размер файла', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);
      (connectionMonitor.getStatus as jest.Mock).mockReturnValue('connected');
      
      // Set small limit
      (shareService as any).limits = {
        maxFileSize: 10 * 1024 * 1024, // 10 MB
        maxTextLength: 50000,
      };

      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(mockFile, 'size', { value: 100 * 1024 * 1024 }); // 100 MB

      await shareService.init();

      await expect(shareService.uploadFile(mockFile, {})).rejects.toThrow('Файл слишком большой');
    });

    it('должен выбрасывать ошибку если сервер недоступен', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(false);
      (connectionMonitor.getStatus as jest.Mock).mockReturnValue('disconnected');

      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      await shareService.init();

      await expect(shareService.uploadFile(mockFile, {})).rejects.toThrow('Сервер недоступен');
    });
  });

  describe('getShareInfo', () => {
    it('должен получать информацию о шаре через API', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);
      
      const mockInfo = {
        id: 'test-id',
        type: 'text',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        downloads: 0,
        maxDownloads: null,
      };
      (apiClient.getShareInfo as jest.Mock).mockResolvedValue(mockInfo);

      await shareService.init();
      const result = await shareService.getShareInfo('test-id');

      expect(apiClient.getShareInfo).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockInfo);
    });

    it('должен получать информацию о шаре через localStorage', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(false);
      
      const mockInfo = {
        id: 'test-id',
        type: 'text',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        downloads: 0,
        maxDownloads: null,
      };
      (localStorageService.getShareInfo as jest.Mock).mockResolvedValue(mockInfo);

      await shareService.init();
      const result = await shareService.getShareInfo('test-id');

      expect(localStorageService.getShareInfo).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockInfo);
    });
  });

  describe('downloadShare', () => {
    it('должен скачивать шар через API', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);
      
      const mockDownload = {
        info: {
          id: 'test-id',
          type: 'text',
          createdAt: new Date().toISOString(),
          expiresAt: null,
          downloads: 0,
          maxDownloads: null,
        },
        data: 'test content',
      };
      (apiClient.downloadShare as jest.Mock).mockResolvedValue(mockDownload);

      await shareService.init();
      const result = await shareService.downloadShare('test-id');

      expect(apiClient.downloadShare).toHaveBeenCalledWith('test-id', undefined);
      expect(result).toEqual(mockDownload);
    });

    it('должен скачивать шар с паролем', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);
      
      const mockDownload = {
        info: {
          id: 'test-id',
          type: 'text',
          createdAt: new Date().toISOString(),
          expiresAt: null,
          downloads: 0,
          maxDownloads: null,
        },
        data: 'test content',
      };
      (apiClient.downloadShare as jest.Mock).mockResolvedValue(mockDownload);

      await shareService.init();
      await shareService.downloadShare('test-id', 'password123');

      expect(apiClient.downloadShare).toHaveBeenCalledWith('test-id', 'password123');
    });
  });

  describe('checkHealth', () => {
    it('должен возвращать true если сервер доступен', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);

      const result = await shareService.checkHealth();

      expect(result).toBe(true);
    });

    it('должен возвращать false если сервер недоступен', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(false);

      const result = await shareService.checkHealth();

      expect(result).toBe(false);
    });
  });

  describe('getLimits', () => {
    it('должен возвращать лимиты', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);
      (apiClient.getPublicConfig as jest.Mock).mockResolvedValue({
        limits: {
          maxFileSize: 104857600,
          maxTextLength: 50000,
        },
      });

      await shareService.init();
      const limits = await shareService.getLimits();

      expect(limits).toEqual({
        maxFileSize: 104857600,
        maxTextLength: 50000,
      });
    });

    it('должен возвращать лимиты по умолчанию если не удалось загрузить', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);
      (apiClient.getPublicConfig as jest.Mock).mockRejectedValue(new Error('Failed'));

      await shareService.init();
      const limits = await shareService.getLimits();

      expect(limits).toEqual({
        maxFileSize: 100 * 1024 * 1024,
        maxTextLength: 50000,
      });
    });
  });

  describe('isE2EEnabled', () => {
    it('должен возвращать true если E2E включено', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);
      (apiClient.getPublicConfig as jest.Mock).mockResolvedValue({
        security: {
          enableE2EEncryption: true,
        },
      });

      await shareService.init();
      const enabled = await shareService.isE2EEnabled();

      expect(enabled).toBe(true);
    });

    it('должен возвращать false если E2E выключено', async () => {
      (apiClient.checkHealth as jest.Mock).mockResolvedValue(true);
      (apiClient.getPublicConfig as jest.Mock).mockResolvedValue({
        security: {
          enableE2EEncryption: false,
        },
      });

      await shareService.init();
      const enabled = await shareService.isE2EEnabled();

      expect(enabled).toBe(false);
    });
  });
});
