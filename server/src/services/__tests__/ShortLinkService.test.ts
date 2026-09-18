import { ShortLinkService } from '../ShortLinkService';

describe('ShortLinkService', () => {
  let shortLinkService: ShortLinkService;

  beforeEach(() => {
    shortLinkService = new ShortLinkService();
  });

  describe('generate', () => {
    it('должен генерировать 8-символьный ID по умолчанию', () => {
      const id = shortLinkService.generate();
      
      expect(id).toHaveLength(8);
      expect(typeof id).toBe('string');
    });

    it('должен генерировать уникальные ID', () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        ids.add(shortLinkService.generate());
      }
      
      // Все ID должны быть уникальными
      expect(ids.size).toBe(100);
    });

    it('должен содержать только буквенно-цифровые символы', () => {
      const id = shortLinkService.generate();
      
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('не должен содержать неоднозначные символы (0, O, I, l, 1)', () => {
      // Генерируем много ID и проверяем на неоднозначные символы
      for (let i = 0; i < 100; i++) {
        const id = shortLinkService.generate();
        
        // Не должен содержать 0, O, I, l (строчная L)
        expect(id).not.toMatch(/[0OIl]/);
      }
    });
  });

  describe('generateCustom', () => {
    it('должен генерировать ID с пользовательской длиной', () => {
      const id4 = shortLinkService.generateCustom(4);
      const id12 = shortLinkService.generateCustom(12);
      const id20 = shortLinkService.generateCustom(20);
      
      expect(id4).toHaveLength(4);
      expect(id12).toHaveLength(12);
      expect(id20).toHaveLength(20);
    });

    it('должен использовать длину по умолчанию, если не указана', () => {
      const id = shortLinkService.generateCustom();
      
      expect(id).toHaveLength(8);
    });
  });

  describe('isValid', () => {
    it('должен принимать валидные ID', () => {
      expect(shortLinkService.isValid('abcd1234')).toBe(true);
      expect(shortLinkService.isValid('ABCDEFGH')).toBe(true);
      expect(shortLinkService.isValid('aB3dEf7h')).toBe(true);
    });

    it('должен отклонять ID с недопустимыми символами', () => {
      expect(shortLinkService.isValid('abc-1234')).toBe(false);
      expect(shortLinkService.isValid('abc_1234')).toBe(false);
      expect(shortLinkService.isValid('abc 1234')).toBe(false);
      expect(shortLinkService.isValid('abc!1234')).toBe(false);
    });

    it('должен отклонять слишком короткие ID', () => {
      expect(shortLinkService.isValid('abc')).toBe(false);
      expect(shortLinkService.isValid('')).toBe(false);
    });

    it('должен отклонять слишком длинные ID', () => {
      const longId = 'a'.repeat(21);
      expect(shortLinkService.isValid(longId)).toBe(false);
    });

    it('должен принимать ID на граничных длинах', () => {
      expect(shortLinkService.isValid('abcd')).toBe(true); // 4 символа - минимум
      expect(shortLinkService.isValid('a'.repeat(20))).toBe(true); // 20 символов - максимум
    });
  });
});
