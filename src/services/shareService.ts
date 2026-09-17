import {
  ShareCreateRequest,
  ShareCreateResponse,
  ShareDownload,
  ShareInfo,
} from '../types';
import { apiClient } from './api';
import { localStorageService } from './storage';

type ShareServiceInterface = {
  createShare(data: ShareCreateRequest): Promise<ShareCreateResponse>;
  uploadFile(
    file: File,
    options: { expiresIn?: number; maxDownloads?: number; password?: string }
  ): Promise<ShareCreateResponse>;
  getShareInfo(id: string): Promise<ShareInfo>;
  downloadShare(id: string, password?: string): Promise<ShareDownload>;
  checkHealth(): Promise<boolean>;
};

class ShareService implements ShareServiceInterface {
  private useApi: boolean = false;
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.useApi = await apiClient.checkHealth();
    } catch {
      this.useApi = false;
    }
    this.initialized = true;
  }

  private get backend() {
    return this.useApi ? apiClient : localStorageService;
  }

  async createShare(data: ShareCreateRequest): Promise<ShareCreateResponse> {
    await this.init();
    return this.backend.createShare(data);
  }

  async uploadFile(
    file: File,
    options: { expiresIn?: number; maxDownloads?: number; password?: string }
  ): Promise<ShareCreateResponse> {
    await this.init();
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
}

export const shareService = new ShareService();
export default shareService;
