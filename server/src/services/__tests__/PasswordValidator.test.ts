import { PasswordValidator } from '../PasswordValidator';

describe('PasswordValidator', () => {
  describe('validate', () => {
    it('должен принимать надёжный пароль', () => {
      const result = PasswordValidator.validate('MyStr0ng!Pass');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.requirements.minLength).toBe(true);
      expect(result.requirements.hasUppercase).toBe(true);
      expect(result.requirements.hasLowercase).toBe(true);
      expect(result.requirements.hasNumber).toBe(true);
      expect(result.requirements.hasSpecial).toBe(true);
      expect(result.requirements.notCommon).toBe(true);
    });

    it('должен отклонять пароль без заглавных букв', () => {
      const result = PasswordValidator.validate('mystr0ng!pass');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasUppercase).toBe(false);
      expect(result.feedback).toContain('Добавьте заглавную букву (A-Z)');
    });

    it('должен отклонять пароль без строчных букв', () => {
      const result = PasswordValidator.validate('MYSTR0NG!PASS');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasLowercase).toBe(false);
      expect(result.feedback).toContain('Добавьте строчную букву (a-z)');
    });

    it('должен отклонять пароль без цифр', () => {
      const result = PasswordValidator.validate('MyStrong!Pass');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasNumber).toBe(false);
      expect(result.feedback).toContain('Добавьте цифру (0-9)');
    });

    it('должен отклонять пароль без спецсимволов', () => {
      const result = PasswordValidator.validate('MyStr0ngPass');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasSpecial).toBe(false);
      expect(result.feedback).toContain('Добавьте специальный символ (!@#$%^&*)');
    });

    it('должен отклонять короткий пароль', () => {
      const result = PasswordValidator.validate('My1!');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.minLength).toBe(false);
      expect(result.feedback).toContain('Минимум 8 символов');
    });

    it('должен отклонять распространённый пароль', () => {
      const result = PasswordValidator.validate('password123!');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.notCommon).toBe(false);
      expect(result.feedback).toContain('Этот пароль слишком распространён');
    });

    it('должен отклонять "12345678"', () => {
      const result = PasswordValidator.validate('12345678');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.notCommon).toBe(false);
    });

    it('должен отклонять "admin123"', () => {
      const result = PasswordValidator.validate('admin123');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.notCommon).toBe(false);
    });

    it('должен корректно рассчитывать оценку', () => {
      const weakResult = PasswordValidator.validate('weak');
      const strongResult = PasswordValidator.validate('MyStr0ng!Pass123');
      
      expect(weakResult.score).toBeLessThan(strongResult.score);
    });

    it('должен обрабатывать пустой пароль', () => {
      const result = PasswordValidator.validate('');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('getStrengthLabel', () => {
    it('должен возвращать "Очень слабый" для оценки < 30', () => {
      const result = PasswordValidator.getStrengthLabel(20);
      expect(result.label).toBe('Очень слабый');
      expect(result.color).toBe('red');
    });

    it('должен возвращать "Слабый" для оценки 30-49', () => {
      const result = PasswordValidator.getStrengthLabel(40);
      expect(result.label).toBe('Слабый');
      expect(result.color).toBe('orange');
    });

    it('должен возвращать "Средний" для оценки 50-69', () => {
      const result = PasswordValidator.getStrengthLabel(60);
      expect(result.label).toBe('Средний');
      expect(result.color).toBe('yellow');
    });

    it('должен возвращать "Сильный" для оценки 70-89', () => {
      const result = PasswordValidator.getStrengthLabel(80);
      expect(result.label).toBe('Сильный');
      expect(result.color).toBe('green');
    });

    it('должен возвращать "Очень сильный" для оценки >= 90', () => {
      const result = PasswordValidator.getStrengthLabel(95);
      expect(result.label).toBe('Очень сильный');
      expect(result.color).toBe('emerald');
    });

    it('должен обрабатывать граничные значения', () => {
      expect(PasswordValidator.getStrengthLabel(0).label).toBe('Очень слабый');
      expect(PasswordValidator.getStrengthLabel(100).label).toBe('Очень сильный');
    });
  });
});
