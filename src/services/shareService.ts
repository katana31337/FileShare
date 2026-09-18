import {
  ShareCreateRequest,
  ShareCreateResponse,
  ShareDownload,
  ShareInfo,
} from '../types';
import { apiClient } from './api';
import { localStorageService } from './storage';
import { connectionMonitor } from './ConnectionMonitor';

type ShareServiceInterface = {
  createShare(data: ShareCreateRequest): Promise<ShareCreateResponse>;
  uploadFile(
    file: File,
    options: { expiresIn?: number; maxDownloads?: number; password?: string }
  ): Promise<ShareCreateResponse>;
  getShareInfo(id: string): Promise<ShareInfo>;
  downloadShare(id: string, password?: string): Promise<ShareDownload>;
  checkHealth(): Promise<boolean>;
  getLimits(): Promise<{ maxFileSize: number; maxTextLength: number }>;
};

class ShareService implements ShareServiceInterface {
  private useApi: boolean = false;
  private initialized: boolean = false;
  private limits: { maxFileSize: number; maxTextLength: number } = {
    maxFileSize: 100 * 1024 * 1024, // 100MB default
    maxTextLength: 50000,
  };

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.useApi = await apiClient.checkHealth();
      if (this.useApi) {
        await this.loadLimits();
      }
    } catch {
      this.useApi = false;
    }
    this.initialized = true;
  }

  private async loadLimits(): Promise<void> {
    try {
      const config = await apiClient.getPublicConfig();
      if (config && config.limits) {
        this.limits = {
          maxFileSize: config.limits.maxFileSize || this.limits.maxFileSize,
          maxTextLength: config.limits.maxTextLength || this.limits.maxTextLength,
        };
      }
    } catch {
      // Use defaults if can't load
    }
  }

  private get backend() {
    return this.useApi ? apiClient : localStorageService;
  }

  async createShare(data: ShareCreateRequest): Promise<ShareCreateResponse> {
    await this.init();
    
    // Check if server is available
    const isConnected = connectionMonitor.getStatus() === 'connected';
    if (!isConnected && !this.useApi) {
      throw new Error('Сервер недоступен. Создание ссылок невозможно в оффлайн режиме.');
    }

    return this.backend.createShare(data);
  }

  async uploadFile(
    file: File,
    options: { expiresIn?: number; maxDownloads?: number; password?: string }
  ): Promise<ShareCreateResponse> {
    await this.init();

    // Check file size
    if (file.size > this.limits.maxFileSize) {
      const maxSizeMB = Math.round(this.limits.maxFileSize / (1024 * 1024));
      throw new Error(`Файл слишком большой. Максимальный размер: ${maxSizeMB} МБ`);
    }

    // Check if server is available
    const isConnected = connectionMonitor.getStatus() === 'connected';
    if (!isConnected && !this.useApi) {
      throw new Error('Сервер недоступен. Загрузка файлов невозможна в оффлайн режиме.');
    }

    return this.backend.uploadFile(file, options);
  }

  async getShareInfo(id: string): Promise<ShareInfo> {
    await this.init();
    return this.backend.getShareInfo(id);
  }

  async downloadShare(id: string, password?: string): Promise<ShareDownload> {
    await this.init();
    return this.backend.downloadShare(id, password);
  }

  async checkHealth(): Promise<boolean> {
    await this.init();
    return this.useApi;
  }

  async getLimits(): Promise<{ maxFileSize: number; maxTextLength: number }> {
    await this.init();
    return this.limits;
  }
}

export const shareService = new ShareService();
export default shareService;
