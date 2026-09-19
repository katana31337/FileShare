import { database } from '../db/database';
import { ShareRecord } from '../db/adapters/IDatabaseAdapter';
import { shortLinkService } from './ShortLinkService';
import { fileService } from './FileService';

/**
 * Share Service - Orchestrates share operations
 * Follows Dependency Inversion Principle by depending on abstractions.
 */

export interface CreateShareInput {
  type: 'file' | 'text';
  content?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  filePath?: string;
  expiresIn?: number;
  maxDownloads?: number;
  password?: string;
  e2eEncrypted?: boolean;
}

export interface ShareResponse {
  id: string;
  shortUrl: string;
  fullUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface ShareInfoResponse {
  id: string;
  type: 'file' | 'text';
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  expiresAt: string | null;
  downloads: number;
  maxDownloads: number | null;
  e2eEncrypted?: boolean;
}

export interface ShareDownloadResponse {
  info: ShareInfoResponse;
  data?: string;
}

class ShareService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async createShare(input: CreateShareInput, baseUrl?: string): Promise<ShareResponse> {
    const id = shortLinkService.generate();

    const expiresAt = input.expiresIn
      ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
      : null;

    const passwordHash = input.password
      ? fileService.hashPassword(input.password)
      : null;

    const record = await database.createShare({
      id,
      type: input.type,
      file_name: input.fileName || null,
      file_size: input.fileSize || null,
      mime_type: input.mimeType || null,
      content: input.content || null,
      file_path: input.filePath || null,
      password_hash: passwordHash,
      max_downloads: input.maxDownloads || null,
      expires_at: expiresAt,
      e2e_encrypted: input.e2eEncrypted || false,
    });

    const finalBaseUrl = baseUrl || this.baseUrl;

    return {
      id: record.id,
      shortUrl: `/s/${record.id}`,
      fullUrl: `${finalBaseUrl}/s/${record.id}`,
      expiresAt: record.expires_at,
      createdAt: record.created_at,
    };
  }

  async getShareInfo(id: string): Promise<ShareInfoResponse> {
    const record = await database.findShareById(id);
    if (!record) {
      throw new Error('Share not found or expired');
    }

    if (record.max_downloads && record.downloads >= record.max_downloads) {
      throw new Error('This share has reached its download limit');
    }

    return {
      id: record.id,
      type: record.type,
      fileName: record.file_name || undefined,
      fileSize: record.file_size || undefined,
      mimeType: record.mime_type || undefined,
      createdAt: record.created_at,
      expiresAt: record.expires_at,
      downloads: record.downloads,
      maxDownloads: record.max_downloads,
      e2eEncrypted: record.e2e_encrypted,
    };
  }

  async downloadShare(id: string, password?: string): Promise<ShareDownloadResponse> {
    const record = await database.findShareById(id);
    if (!record) {
      throw new Error('Share not found or expired');
    }

    // Check max downloads
    if (record.max_downloads && record.downloads >= record.max_downloads) {
      throw new Error('This share has reached its download limit');
    }

    // Check password
    if (record.password_hash) {
      if (!password) {
        throw new Error('Password required');
      }
      if (!fileService.verifyPassword(password, record.password_hash)) {
        throw new Error('Invalid password');
      }
    }

    // Increment downloads
    await database.incrementShareDownloads(id);

    const info = await this.getShareInfo(id);

    let data: string | undefined;
    if (record.type === 'file' && record.file_path) {
      const buffer = await fileService.getFile(record.file_path);
      data = `data:${record.mime_type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
    } else if (record.type === 'text') {
      data = record.content || '';
    }

    // Check if we should delete after last download
    if (record.max_downloads && record.downloads + 1 >= record.max_downloads) {
      if (record.file_path) {
        await fileService.deleteFile(record.file_path);
      }
    }

    return { info, data };
  }

  async cleanupOldHistory(retentionDays: number): Promise<number> {
    if (retentionDays === 0) {
      return 0; // Бессрочное хранение
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISOString = cutoffDate.toISOString();

    // Получаем все шары старше cutoffDate
    const allShares = await database.listShares({ limit: 10000 });
    const oldShares = allShares.filter(share => 
      share.created_at < cutoffISOString
    );

    let deletedCount = 0;
    for (const share of oldShares) {
      // Удаляем файл если это был файл
      if (share.file_path) {
        try {
          await fileService.deleteFile(share.file_path);
        } catch (error) {
          // Игнорируем ошибки удаления файлов
        }
      }
      
      // Удаляем запись из БД
      await database.deleteShare(share.id);
      deletedCount++;
    }

    return deletedCount;
  }

  getStats() {
    return database.getStats();
  }
}

export const shareService = new ShareService();
export default ShareService;
