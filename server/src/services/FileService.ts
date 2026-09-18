import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * File Service - Single Responsibility Principle
 * Handles file storage, retrieval, and cleanup.
 */
export class FileService {
  private uploadDir: string;
  private maxFileSize: number;
  private maxFileNameLength: number = 255;

  // Dangerous characters that could be used for attacks
  private readonly DANGEROUS_CHARS = /[<>:"|?*\x00-\x1F]/;
  private readonly PATH_TRAVERSAL = /(\.\.[\/\\]|[\/\\]\.\.)/;
  
  // Dangerous MIME types
  private readonly DANGEROUS_MIME_TYPES = [
    'application/x-executable',
    'application/x-sharedlib',
    'application/x-msdownload',
    'application/x-dosexec',
  ];

  constructor(uploadDir?: string, maxFileSize: number = 100 * 1024 * 1024) {
    this.uploadDir = uploadDir || path.join(process.cwd(), 'data', 'uploads');
    this.maxFileSize = maxFileSize;
    this.ensureUploadDir();
  }

  /**
   * Validate file name for security
   */
  validateFileName(fileName: string): void {
    if (!fileName || fileName.trim().length === 0) {
      throw new Error('Имя файла не может быть пустым');
    }

    if (fileName.length > this.maxFileNameLength) {
      throw new Error(`Имя файла слишком длинное. Максимум ${this.maxFileNameLength} символов`);
    }

    // Check for path traversal
    if (this.PATH_TRAVERSAL.test(fileName)) {
      throw new Error('Обнаружена попытка path traversal атаки');
    }

    // Check for dangerous characters
    if (this.DANGEROUS_CHARS.test(fileName)) {
      throw new Error('Имя файла содержит недопустимые символы');
    }

    // Check for null bytes
    if (fileName.includes('\0')) {
      throw new Error('Имя файла содержит null byte');
    }
  }

  /**
   * Validate file size
   */
  validateFileSize(fileSize: number, maxSize?: number): void {
    const limit = maxSize || this.maxFileSize;
    
    if (fileSize < 0) {
      throw new Error('Размер файла не может быть отрицательным');
    }

    if (fileSize > limit) {
      const limitMB = Math.round(limit / (1024 * 1024));
      throw new Error(`Файл слишком большой. Максимальный размер: ${limitMB} МБ`);
    }
  }

  /**
   * Validate MIME type
   */
  validateMimeType(mimeType: string): void {
    if (!mimeType || mimeType.trim().length === 0) {
      throw new Error('MIME тип не может быть пустым');
    }

    // Check for dangerous MIME types
    if (this.DANGEROUS_MIME_TYPES.includes(mimeType)) {
      throw new Error(`MIME тип ${mimeType} не разрешён из соображений безопасности`);
    }
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, originalName: string, id: string): Promise<string> {
    // Validate file name before saving
    this.validateFileName(originalName);
    
    const ext = path.extname(originalName);
    const fileName = `${id}${ext}`;
    const filePath = path.join(this.uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  async getFile(filePath: string): Promise<Buffer> {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found on server');
    }
    return fs.readFileSync(filePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  getFileSize(filePath: string): number {
    if (!fs.existsSync(filePath)) return 0;
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }
}

export const fileService = new FileService();
export default FileService;
