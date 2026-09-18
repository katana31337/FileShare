import { CryptoService } from '../CryptoService';

describe('CryptoService', () => {
  let cryptoService: CryptoService;

  beforeEach(() => {
    cryptoService = new CryptoService();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when Web Crypto API is available', () => {
      expect(CryptoService.isAvailable()).toBe(true);
    });

    it('should return false when crypto is undefined', () => {
      const originalCrypto = global.crypto;
      // @ts-ignore
      delete global.crypto;
      
      expect(CryptoService.isAvailable()).toBe(false);
      
      global.crypto = originalCrypto;
    });
  });

  describe('deriveKey', () => {
    it('should derive a key from password', async () => {
      const mockKey = { type: 'secret' } as CryptoKey;
      
      (crypto.subtle.importKey as jest.Mock).mockResolvedValue(mockKey);
      (crypto.subtle.deriveKey as jest.Mock).mockResolvedValue(mockKey);

      const key = await cryptoService.deriveKey('test-password');

      expect(crypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      expect(crypto.subtle.deriveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          iterations: 100000,
          hash: 'SHA-256',
        }),
        mockKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      expect(key).toBe(mockKey);
    });

    it('should use the same salt for all derivations', async () => {
      const mockKey = { type: 'secret' } as CryptoKey;
      
      (crypto.subtle.importKey as jest.Mock).mockResolvedValue(mockKey);
      (crypto.subtle.deriveKey as jest.Mock).mockResolvedValue(mockKey);

      await cryptoService.deriveKey('password1');
      const firstCallSalt = (crypto.subtle.deriveKey as jest.Mock).mock.calls[0][0].salt;

      await cryptoService.deriveKey('password2');
      const secondCallSalt = (crypto.subtle.deriveKey as jest.Mock).mock.calls[1][0].salt;

      expect(firstCallSalt).toEqual(secondCallSalt);
    });
  });

  describe('encryptText', () => {
    it('should encrypt text and return base64 string', async () => {
      const mockKey = { type: 'secret' } as CryptoKey;
      const mockEncrypted = new ArrayBuffer(10);
      
      (crypto.subtle.encrypt as jest.Mock).mockResolvedValue(mockEncrypted);

      const result = await cryptoService.encryptText('test data', mockKey);

      expect(crypto.subtle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AES-GCM',
          iv: expect.any(Uint8Array),
        }),
        mockKey,
        expect.any(Uint8Array)
      );

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should use random IV for each encryption', async () => {
      const mockKey = { type: 'secret' } as CryptoKey;
      const mockEncrypted = new ArrayBuffer(10);
      
      (crypto.subtle.encrypt as jest.Mock).mockResolvedValue(mockEncrypted);

      await cryptoService.encryptText('test1', mockKey);
      const firstIV = (crypto.subtle.encrypt as jest.Mock).mock.calls[0][0].iv;

      await cryptoService.encryptText('test2', mockKey);
      const secondIV = (crypto.subtle.encrypt as jest.Mock).mock.calls[1][0].iv;

      // IVs should be different (with high probability)
      expect(firstIV).not.toEqual(secondIV);
    });
  });

  describe('decryptText', () => {
    it('should decrypt base64 encrypted text', async () => {
      const mockKey = { type: 'secret' } as CryptoKey;
      const mockDecrypted = new TextEncoder().encode('decrypted text');
      
      (crypto.subtle.decrypt as jest.Mock).mockResolvedValue(mockDecrypted.buffer);

      // Create a valid encrypted string (IV + ciphertext)
      const iv = new Uint8Array(12);
      const ciphertext = new Uint8Array([1, 2, 3, 4, 5]);
      const combined = new Uint8Array(iv.length + ciphertext.length);
      combined.set(iv, 0);
      combined.set(ciphertext, iv.length);
      const encryptedB64 = btoa(String.fromCharCode(...combined));

      const result = await cryptoService.decryptText(encryptedB64, mockKey);

      expect(crypto.subtle.decrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AES-GCM',
          iv: expect.any(Uint8Array),
        }),
        mockKey,
        expect.any(Uint8Array)
      );

      expect(result).toBe('decrypted text');
    });

    it('should throw error for invalid base64', async () => {
      const mockKey = { type: 'secret' } as CryptoKey;

      await expect(
        cryptoService.decryptText('invalid-base64!!!', mockKey)
      ).rejects.toThrow();
    });
  });

  describe('encryptFileBuffer', () => {
    it('should encrypt ArrayBuffer and return base64', async () => {
      const mockKey = { type: 'secret' } as CryptoKey;
      const mockEncrypted = new ArrayBuffer(10);
      const fileBuffer = new ArrayBuffer(100);
      
      (crypto.subtle.encrypt as jest.Mock).mockResolvedValue(mockEncrypted);

      const result = await cryptoService.encryptFileBuffer(fileBuffer, mockKey);

      expect(crypto.subtle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AES-GCM',
          iv: expect.any(Uint8Array),
        }),
        mockKey,
        fileBuffer
      );

      expect(typeof result).toBe('string');
    });
  });

  describe('decryptFileBuffer', () => {
    it('should decrypt base64 to ArrayBuffer', async () => {
      const mockKey = { type: 'secret' } as CryptoKey;
      const mockDecrypted = new ArrayBuffer(100);
      
      (crypto.subtle.decrypt as jest.Mock).mockResolvedValue(mockDecrypted);

      // Create a valid encrypted string
      const iv = new Uint8Array(12);
      const ciphertext = new Uint8Array([1, 2, 3, 4, 5]);
      const combined = new Uint8Array(iv.length + ciphertext.length);
      combined.set(iv, 0);
      combined.set(ciphertext, iv.length);
      const encryptedB64 = btoa(String.fromCharCode(...combined));

      const result = await cryptoService.decryptFileBuffer(encryptedB64, mockKey);

      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('Integration: encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', async () => {
      const mockKey = { type: 'secret' } as CryptoKey;
      const originalText = 'Hello, World!';
      
      // Mock encrypt to return predictable data
      const iv = new Uint8Array(12).fill(1);
      const encryptedData = new TextEncoder().encode('encrypted');
      const combined = new Uint8Array(iv.length + encryptedData.length);
      combined.set(iv, 0);
      combined.set(encryptedData, iv.length);
      
      (crypto.subtle.encrypt as jest.Mock).mockResolvedValue(encryptedData.buffer);
      (crypto.subtle.decrypt as jest.Mock).mockResolvedValue(
        new TextEncoder().encode(originalText).buffer
      );

      const encrypted = await cryptoService.encryptText(originalText, mockKey);
      const decrypted = await cryptoService.decryptText(encrypted, mockKey);

      expect(decrypted).toBe(originalText);
    });
  });
});
