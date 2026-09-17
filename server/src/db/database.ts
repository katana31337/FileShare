import Database from 'better-sqlite3';
import path from 'path';

/**
 * Database Service - Single Responsibility Principle
 * Handles all database operations for the QuickShare application.
 */
export interface ShareRecord {
  id: string;
  type: 'file' | 'text';
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  content: string | null;
  file_path: string | null;
  password_hash: string | null;
  max_downloads: number | null;
  downloads: number;
  created_at: string;
  expires_at: string | null;
}

class DatabaseService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(process.cwd(), 'data', 'quickshare.db');
    
    // Ensure data directory exists
    const fs = require('fs');
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(resolvedPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('file', 'text')),
        file_name TEXT,
        file_size INTEGER,
        mime_type TEXT,
        content TEXT,
        file_path TEXT,
        password_hash TEXT,
        max_downloads INTEGER,
        downloads INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_shares_expires ON shares(expires_at);
      CREATE INDEX IF NOT EXISTS idx_shares_created ON shares(created_at);
    `);

    // Cleanup expired shares periodically
    this.cleanupExpired();
    setInterval(() => this.cleanupExpired(), 60 * 60 * 1000); // Every hour
  }

  private cleanupExpired(): void {
    this.db.prepare(`
      DELETE FROM shares 
      WHERE expires_at IS NOT NULL AND expires_at < datetime('now')
    `).run();
  }

  create(share: Omit<ShareRecord, 'downloads' | 'created_at'>): ShareRecord {
    const stmt = this.db.prepare(`
      INSERT INTO shares (id, type, file_name, file_size, mime_type, content, file_path, password_hash, max_downloads, expires_at)
      VALUES (@id, @type, @file_name, @file_size, @mime_type, @content, @file_path, @password_hash, @max_downloads, @expires_at)
    `);

    stmt.run({
      ...share,
      downloads: 0,
      created_at: new Date().toISOString(),
    });

    return this.findById(share.id)!;
  }

  findById(id: string): ShareRecord | null {
    const stmt = this.db.prepare('SELECT * FROM shares WHERE id = ?');
    const record = stmt.get(id) as ShareRecord | undefined;
    
    if (!record) return null;
    
    // Check if expired
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      this.delete(id);
      return null;
    }

    return record;
  }

  incrementDownloads(id: string): void {
    this.db.prepare('UPDATE shares SET downloads = downloads + 1 WHERE id = ?').run(id);
  }

  delete(id: string): void {
    const record = this.findById(id);
    if (record?.file_path) {
      const fs = require('fs');
      if (fs.existsSync(record.file_path)) {
        fs.unlinkSync(record.file_path);
      }
    }
    this.db.prepare('DELETE FROM shares WHERE id = ?').run(id);
  }

  getStats(): { totalShares: number; totalDownloads: number; activeShares: number } {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM shares').get() as { count: number };
    const downloads = this.db.prepare('SELECT COALESCE(SUM(downloads), 0) as total FROM shares').get() as { total: number };
    const active = this.db.prepare("SELECT COUNT(*) as count FROM shares WHERE expires_at IS NULL OR expires_at > datetime('now')").get() as { count: number };

    return {
      totalShares: total.count,
      totalDownloads: downloads.total,
      activeShares: active.count,
    };
  }

  close(): void {
    this.db.close();
  }
}

export const database = new DatabaseService();
export default DatabaseService;
