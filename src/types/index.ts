export type ShareType = 'file' | 'text';

export interface ShareCreateRequest {
  type: ShareType;
  content?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  expiresIn?: number; // seconds
  maxDownloads?: number;
  password?: string;
  e2eEncrypted?: boolean; // flag for E2E encrypted content
}

export interface ShareCreateResponse {
  id: string;
  shortUrl: string;
  fullUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface ShareInfo {
  id: string;
  type: ShareType;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  content?: string;
  createdAt: string;
  expiresAt: string | null;
  downloads: number;
  maxDownloads: number | null;
  e2eEncrypted?: boolean;
}

export interface ShareDownload {
  info: ShareInfo;
  data?: string; // base64 for files, text content for text
}

export interface ApiError {
  error: string;
  message: string;
}
