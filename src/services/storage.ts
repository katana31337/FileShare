import {
  ShareCreateRequest,
  ShareCreateResponse,
  ShareDownload,
  ShareInfo,
} from '../types';

const STORAGE_PREFIX = 'quickshare_';

function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateShortUrl(id: string): string {
  return `${window.location.origin}/s/${id}`;
}

class LocalStorageService {
  private getKey(id: string): string {
    return `${STORAGE_PREFIX}${id}`;
  }

  async createShare(data: ShareCreateRequest): Promise<ShareCreateResponse> {
    const id = generateId();
    const now = new Date();
    const expiresAt = data.expiresIn
      ? new Date(now.getTime() + data.expiresIn * 1000).toISOString()
      : null;

    const shareData: ShareInfo = {
      id,
      type: data.type,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      content: data.content,
      createdAt: now.toISOString(),
      expiresAt,
      downloads: 0,
      maxDownloads: data.maxDownloads || null,
    };

    // Store file content as base64 if it's a file
    if (data.type === 'file' && data.content) {
      localStorage.setItem(this.getKey(id), JSON.stringify(shareData));
    } else {
      localStorage.setItem(this.getKey(id), JSON.stringify(shareData));
    }

    return {
      id,
      shortUrl: `/s/${id}`,
      fullUrl: generateShortUrl(id),
      expiresAt,
      createdAt: now.toISOString(),
    };
  }

  async uploadFile(
    file: File,
    options: { expiresIn?: number; maxDownloads?: number; password?: string }
  ): Promise<ShareCreateResponse> {
    const base64 = await this.fileToBase64(file);

    return this.createShare({
      type: 'file',
      content: base64,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      expiresIn: options.expiresIn,
      maxDownloads: options.maxDownloads,
      password: options.password,
    });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  }

  async getShareInfo(id: string): Promise<ShareInfo> {
    const data = localStorage.getItem(this.getKey(id));
    if (!data) {
      throw new Error('Share not found');
    }

    const share: ShareInfo = JSON.parse(data);

    // Check expiration
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      throw new Error('This share has expired');
    }

    // Check max downloads
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      throw new Error('This share has reached its download limit');
    }

    return share;
  }

  async downloadShare(id: string, _password?: string): Promise<ShareDownload> {
    const info = await this.getShareInfo(id);
    const data = localStorage.getItem(this.getKey(id));
    if (!data) throw new Error('Share not found');

    const share: ShareInfo = JSON.parse(data);
    share.downloads += 1;
    localStorage.setItem(this.getKey(id), JSON.stringify(share));

    return {
      info: share,
      data: share.content,
    };
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}

export const localStorageService = new LocalStorageService();
export default localStorageService;
