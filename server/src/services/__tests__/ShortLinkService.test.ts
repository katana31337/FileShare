import { ShortLinkService } from '../ShortLinkService';

describe('ShortLinkService', () => {
  let shortLinkService: ShortLinkService;

  beforeEach(() => {
    shortLinkService = new ShortLinkService();
  });

  describe('generate', () => {
    it('should generate an 8-character ID by default', () => {
      const id = shortLinkService.generate();
      
      expect(id).toHaveLength(8);
      expect(typeof id).toBe('string');
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        ids.add(shortLinkService.generate());
      }
      
      // All IDs should be unique
      expect(ids.size).toBe(100);
    });

    it('should only contain alphanumeric characters', () => {
      const id = shortLinkService.generate();
      
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should not contain ambiguous characters (0, O, I, l, 1)', () => {
      // Generate many IDs and check for ambiguous characters
      for (let i = 0; i < 100; i++) {
        const id = shortLinkService.generate();
        
        // Should not contain 0, O, I, l (lowercase L)
        expect(id).not.toMatch(/[0OIl]/);
      }
    });
  });

  describe('generateCustom', () => {
    it('should generate ID with custom length', () => {
      const id4 = shortLinkService.generateCustom(4);
      const id12 = shortLinkService.generateCustom(12);
      const id20 = shortLinkService.generateCustom(20);
      
      expect(id4).toHaveLength(4);
      expect(id12).toHaveLength(12);
      expect(id20).toHaveLength(20);
    });

    it('should use default length when not specified', () => {
      const id = shortLinkService.generateCustom();
      
      expect(id).toHaveLength(8);
    });
  });

  describe('isValid', () => {
    it('should accept valid IDs', () => {
      expect(shortLinkService.isValid('abcd1234')).toBe(true);
      expect(shortLinkService.isValid('ABCDEFGH')).toBe(true);
      expect(shortLinkService.isValid('aB3dEf7h')).toBe(true);
    });

    it('should reject IDs with invalid characters', () => {
      expect(shortLinkService.isValid('abc-1234')).toBe(false);
      expect(shortLinkService.isValid('abc_1234')).toBe(false);
      expect(shortLinkService.isValid('abc 1234')).toBe(false);
      expect(shortLinkService.isValid('abc!1234')).toBe(false);
    });

    it('should reject IDs that are too short', () => {
      expect(shortLinkService.isValid('abc')).toBe(false);
      expect(shortLinkService.isValid('')).toBe(false);
    });

    it('should reject IDs that are too long', () => {
      const longId = 'a'.repeat(21);
      expect(shortLinkService.isValid(longId)).toBe(false);
    });

    it('should accept IDs at boundary lengths', () => {
      expect(shortLinkService.isValid('abcd')).toBe(true); // 4 chars - minimum
      expect(shortLinkService.isValid('a'.repeat(20))).toBe(true); // 20 chars - maximum
    });
  });
});
