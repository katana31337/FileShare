/**
 * CryptoService — End-to-End Encryption
 * Uses Web Crypto API for client-side encryption/decryption.
 * 
 * Security:
 * - AES-256-GCM encryption
 * - PBKDF2 key derivation (100,000 iterations)
 * - Random IV for each encryption
 * - Password-based encryption (user provides password)
 */

export class CryptoService {
  private readonly SALT = 'quickshare-e2e-salt-v1';
  private readonly ITERATIONS = 100000;

  async deriveKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(this.SALT),
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptText(plainText: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plainText)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decryptText(encryptedB64: string, key: CryptoKey): Promise<string> {
    const decoder = new TextDecoder();
    const raw = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
    
    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return decoder.decode(decrypted);
  }

  async encryptFileBuffer(fileBuffer: ArrayBuffer, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileBuffer
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decryptFileBuffer(encryptedB64: string, key: CryptoKey): Promise<ArrayBuffer> {
    const raw = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
    
    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);

    return crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
  }

  static isAvailable(): boolean {
    return typeof crypto !== 'undefined' && crypto.subtle !== undefined;
  }
}

export const cryptoService = new CryptoService();
export default cryptoService;
