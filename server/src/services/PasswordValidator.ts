/**
 * PasswordValidator — Validates password strength.
 * Single Responsibility: password complexity checking.
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    notCommon: boolean;
  };
  feedback: string[];
}

export class PasswordValidator {
  private static readonly MIN_LENGTH = 8;
  private static readonly COMMON_PASSWORDS = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'password1', 'admin', 'letmein', 'welcome', 'monkey',
    'master', 'dragon', 'login', 'princess', 'football',
    'shadow', 'sunshine', 'trustno1', 'iloveyou', 'admin123',
  ];

  static validate(password: string): PasswordValidationResult {
    const requirements = {
      minLength: password.length >= this.MIN_LENGTH,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      notCommon: !this.isCommonPassword(password),
    };

    const feedback: string[] = [];

    if (!requirements.minLength) {
      feedback.push(`Минимум ${this.MIN_LENGTH} символов`);
    }
    if (!requirements.hasUppercase) {
      feedback.push('Добавьте заглавную букву (A-Z)');
    }
    if (!requirements.hasLowercase) {
      feedback.push('Добавьте строчную букву (a-z)');
    }
    if (!requirements.hasNumber) {
      feedback.push('Добавьте цифру (0-9)');
    }
    if (!requirements.hasSpecial) {
      feedback.push('Добавьте специальный символ (!@#$%^&*)');
    }
    if (!requirements.notCommon) {
      feedback.push('Этот пароль слишком распространён');
    }

    // Calculate score
    let score = 0;
    score += Math.min(password.length * 4, 40); // Length contribution (max 40)
    if (requirements.hasUppercase) score += 15;
    if (requirements.hasLowercase) score += 15;
    if (requirements.hasNumber) score += 15;
    if (requirements.hasSpecial) score += 15;
    if (!requirements.notCommon) score -= 30; // Penalty for common password

    score = Math.max(0, Math.min(100, score));

    const isValid = Object.values(requirements).every(r => r === true);

    return {
      isValid,
      score,
      requirements,
      feedback,
    };
  }

  private static isCommonPassword(password: string): boolean {
    const lower = password.toLowerCase();
    return this.COMMON_PASSWORDS.some(common => lower.includes(common));
  }

  static getStrengthLabel(score: number): { label: string; color: string } {
    if (score < 30) return { label: 'Очень слабый', color: 'red' };
    if (score < 50) return { label: 'Слабый', color: 'orange' };
    if (score < 70) return { label: 'Средний', color: 'yellow' };
    if (score < 90) return { label: 'Сильный', color: 'green' };
    return { label: 'Очень сильный', color: 'emerald' };
  }
}

export default PasswordValidator;
