import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * File Service - Single Responsibility Principle
 * Handles file storage, retrieval, and cleanup.
 */
class FileService {
  private uploadDir: string;
  private maxFileSize: number;

  constructor(uploadDir?: string, maxFileSize: number = 100 * 1024 * 1024) {
    this.uploadDir = uploadDir || path.join(process.cwd(), 'data', 'uploads');
    this.maxFileSize = maxFileSize;
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, originalName: string, id: string): Promise<string> {
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
