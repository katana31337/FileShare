import {
  ShareCreateRequest,
  ShareCreateResponse,
  ShareDownload,
  ShareInfo,
} from '../types';

const API_BASE = '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'UNKNOWN',
        message: 'An unexpected error occurred',
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async createShare(data: ShareCreateRequest): Promise<ShareCreateResponse> {
    return this.request<ShareCreateResponse>('/shares', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadFile(file: File, options: Omit<ShareCreateRequest, 'type' | 'content'>): Promise<ShareCreateResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'file');
    if (options.expiresIn) formData.append('expiresIn', String(options.expiresIn));
    if (options.maxDownloads) formData.append('maxDownloads', String(options.maxDownloads));
    if (options.password) formData.append('password', options.password);

    const response = await fetch(`${this.baseUrl}/shares/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'UNKNOWN',
        message: 'Upload failed',
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getShareInfo(id: string): Promise<ShareInfo> {
    return this.request<ShareInfo>(`/shares/${id}`);
  }

  async downloadShare(id: string, password?: string): Promise<ShareDownload> {
    const params = password ? `?password=${encodeURIComponent(password)}` : '';
    return this.request<ShareDownload>(`/shares/${id}/download${params}`);
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.request<{ status: string }>('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
