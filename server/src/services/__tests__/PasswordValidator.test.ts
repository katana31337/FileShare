import { PasswordValidator } from '../PasswordValidator';

describe('PasswordValidator', () => {
  describe('validate', () => {
    it('should accept strong password', () => {
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

    it('should reject password without uppercase', () => {
      const result = PasswordValidator.validate('mystr0ng!pass');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasUppercase).toBe(false);
      expect(result.feedback).toContain('Добавьте заглавную букву (A-Z)');
    });

    it('should reject password without lowercase', () => {
      const result = PasswordValidator.validate('MYSTR0NG!PASS');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasLowercase).toBe(false);
      expect(result.feedback).toContain('Добавьте строчную букву (a-z)');
    });

    it('should reject password without number', () => {
      const result = PasswordValidator.validate('MyStrong!Pass');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasNumber).toBe(false);
      expect(result.feedback).toContain('Добавьте цифру (0-9)');
    });

    it('should reject password without special character', () => {
      const result = PasswordValidator.validate('MyStr0ngPass');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.hasSpecial).toBe(false);
      expect(result.feedback).toContain('Добавьте специальный символ (!@#$%^&*)');
    });

    it('should reject short password', () => {
      const result = PasswordValidator.validate('My1!');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.minLength).toBe(false);
      expect(result.feedback).toContain('Минимум 8 символов');
    });

    it('should reject common password', () => {
      const result = PasswordValidator.validate('password123!');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.notCommon).toBe(false);
      expect(result.feedback).toContain('Этот пароль слишком распространён');
    });

    it('should reject "12345678"', () => {
      const result = PasswordValidator.validate('12345678');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.notCommon).toBe(false);
    });

    it('should reject "admin123"', () => {
      const result = PasswordValidator.validate('admin123');
      
      expect(result.isValid).toBe(false);
      expect(result.requirements.notCommon).toBe(false);
    });

    it('should calculate score correctly', () => {
      const weakResult = PasswordValidator.validate('weak');
      const strongResult = PasswordValidator.validate('MyStr0ng!Pass123');
      
      expect(weakResult.score).toBeLessThan(strongResult.score);
    });

    it('should handle empty password', () => {
      const result = PasswordValidator.validate('');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('getStrengthLabel', () => {
    it('should return "Очень слабый" for score < 30', () => {
      const result = PasswordValidator.getStrengthLabel(20);
      expect(result.label).toBe('Очень слабый');
      expect(result.color).toBe('red');
    });

    it('should return "Слабый" for score 30-49', () => {
      const result = PasswordValidator.getStrengthLabel(40);
      expect(result.label).toBe('Слабый');
      expect(result.color).toBe('orange');
    });

    it('should return "Средний" for score 50-69', () => {
      const result = PasswordValidator.getStrengthLabel(60);
      expect(result.label).toBe('Средний');
      expect(result.color).toBe('yellow');
    });

    it('should return "Сильный" for score 70-89', () => {
      const result = PasswordValidator.getStrengthLabel(80);
      expect(result.label).toBe('Сильный');
      expect(result.color).toBe('green');
    });

    it('should return "Очень сильный" for score >= 90', () => {
      const result = PasswordValidator.getStrengthLabel(95);
      expect(result.label).toBe('Очень сильный');
      expect(result.color).toBe('emerald');
    });

    it('should handle edge cases', () => {
      expect(PasswordValidator.getStrengthLabel(0).label).toBe('Очень слабый');
      expect(PasswordValidator.getStrengthLabel(100).label).toBe('Очень сильный');
    });
  });
});
