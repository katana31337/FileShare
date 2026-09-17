import crypto from 'crypto';
import { IDatabaseAdapter, AdminUser } from '../db/adapters/IDatabaseAdapter';

/**
 * AuthService — Handles admin authentication.
 * Single Responsibility: authentication and JWT token management.
 */

interface TokenPayload {
  adminId: string;
  username: string;
  exp: number;
}

export class AuthService {
  private db: IDatabaseAdapter;
  private jwtSecret: string;
  private tokenExpiry: number; // seconds

  constructor(db: IDatabaseAdapter, jwtSecret?: string, tokenExpiry: number = 86400) {
    this.db = db;
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    this.tokenExpiry = tokenExpiry;
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

  generateToken(admin: AdminUser): string {
    const payload: TokenPayload = {
      adminId: admin.id,
      username: admin.username,
      exp: Math.floor(Date.now() / 1000) + this.tokenExpiry,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const [header, body, signature] = token.split('.');
      if (!header || !body || !signature) return null;

      const expectedSig = crypto
        .createHmac('sha256', this.jwtSecret)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (signature !== expectedSig) return null;

      const payload: TokenPayload = JSON.parse(Buffer.from(body, 'base64url').toString());
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;

      return payload;
    } catch {
      return null;
    }
  }

  async login(username: string, password: string): Promise<{ token: string; admin: AdminUser } | null> {
    const admin = await this.db.findAdminByUsername(username);
    if (!admin) return null;

    if (!this.verifyPassword(password, admin.password_hash)) return null;

    await this.db.updateAdminLastLogin(admin.id);
    const token = this.generateToken(admin);
    return { token, admin };
  }

  async createAdmin(username: string, password: string): Promise<AdminUser> {
    const existing = await this.db.findAdminByUsername(username);
    if (existing) throw new Error('Admin with this username already exists');

    const passwordHash = this.hashPassword(password);
    return this.db.createAdmin({
      id: crypto.randomUUID(),
      username,
      password_hash: passwordHash,
    });
  }

  // No longer auto-creates admin — first admin is created via UI setup

  async changePassword(adminId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const admin = await this.db.findAdminById(adminId);
    if (!admin) return false;

    if (!this.verifyPassword(oldPassword, admin.password_hash)) return false;

    const newHash = this.hashPassword(newPassword);
    await this.db.changeAdminPassword(adminId, newHash);
    return true;
  }
}

export default AuthService;
