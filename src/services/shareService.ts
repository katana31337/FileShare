import {
  ShareCreateRequest,
  ShareCreateResponse,
  ShareDownload,
  ShareInfo,
} from '../types';
import { apiClient } from './api';
import { localStorageService } from './storage';
import { connectionMonitor } from './ConnectionMonitor';
import { cryptoService, CryptoService } from './CryptoService';

type ShareServiceInterface = {
  createShare(data: ShareCreateRequest): Promise<ShareCreateResponse>;
  uploadFile(
    file: File,
    options: { expiresIn?: number; maxDownloads?: number; password?: string; e2eEncrypted?: boolean }
  ): Promise<ShareCreateResponse>;
  getShareInfo(id: string): Promise<ShareInfo>;
  downloadShare(id: string, password?: string): Promise<ShareDownload>;
  checkHealth(): Promise<boolean>;
  getLimits(): Promise<{ maxFileSize: number; maxTextLength: number }>;
  isE2EEnabled(): Promise<boolean>;
};

class ShareService implements ShareServiceInterface {
  private useApi: boolean = false;
  private initialized: boolean = false;
  private limits: { maxFileSize: number; maxTextLength: number } = {
    maxFileSize: 100 * 1024 * 1024, // 100MB default
    maxTextLength: 50000,
  };
  private e2eEnabled: boolean = false;

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
    // Use hardcoded defaults on frontend
    // Backend enforces real limits from database
    this.limits = {
      maxFileSize: 100 * 1024 * 1024, // 100MB default
      maxTextLength: 50000,
    };
    this.e2eEnabled = false; // Disabled by default
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

    // E2E encryption for text content
    if (this.e2eEnabled && data.password && data.content && data.type === 'text') {
      try {
        const key = await cryptoService.deriveKey(data.password);
        const encryptedContent = await cryptoService.encryptText(data.content, key);
        
        return this.backend.createShare({
          ...data,
          content: encryptedContent,
          e2eEncrypted: true,
        });
      } catch (error) {
        throw new Error('Ошибка шифрования данных');
      }
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
      throw new Error('Сервер недоступен. Загрузка файлов невозможен в оффлайн режиме.');
    }

    // E2E encryption for files
    if (this.e2eEnabled && options.password) {
      try {
        const key = await cryptoService.deriveKey(options.password);
        const fileBuffer = await file.arrayBuffer();
        const encryptedBuffer = await cryptoService.encryptFileBuffer(fileBuffer, key);
        
        // Create a new File with encrypted content
        const encryptedBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
        const encryptedFile = new File([encryptedBlob], file.name, { type: 'application/octet-stream' });
        
        return this.backend.uploadFile(encryptedFile, {
          ...options,
          e2eEncrypted: true,
        });
      } catch (error) {
        throw new Error('Ошибка шифрования файла');
      }
    }

    return this.backend.uploadFile(file, options);
  }

  async getShareInfo(id: string): Promise<ShareInfo> {
    await this.init();
    return this.backend.getShareInfo(id);
  }

  async downloadShare(id: string, password?: string): Promise<ShareDownload> {
    await this.init();
    const result = await this.backend.downloadShare(id, password);

    // E2E decryption
    if (result.info.e2eEncrypted && password) {
      try {
        const key = await cryptoService.deriveKey(password);
        
        if (result.info.type === 'text' && result.data) {
          result.data = await cryptoService.decryptText(result.data, key);
        } else if (result.info.type === 'file' && result.data) {
          // For files, data is base64 encoded encrypted content
          const decryptedBuffer = await cryptoService.decryptFileBuffer(result.data, key);
          // Convert back to base64 for the frontend to handle
          const bytes = new Uint8Array(decryptedBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          result.data = btoa(binary);
        }
      } catch (error) {
        throw new Error('Ошибка расшифровки данных. Неверный пароль?');
      }
    }

    return result;
  }

  async checkHealth(): Promise<boolean> {
    await this.init();
    return this.useApi;
  }

  async getLimits(): Promise<{ maxFileSize: number; maxTextLength: number }> {
    await this.init();
    return this.limits;
  }

  async isE2EEnabled(): Promise<boolean> {
    await this.init();
    return this.e2eEnabled && CryptoService.isAvailable();
  }
}

export const shareService = new ShareService();
export default shareService;
