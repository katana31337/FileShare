import React, { useState, useEffect, useCallback } from 'react';

interface AdminSetupProps {
  onSuccess: (adminPanelPath: string) => void;
  onCancel: () => void;
}

interface PasswordValidation {
  isValid: boolean;
  score: number;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    notCommon: boolean;
  };
  feedback: string[];
  strength?: { label: string; color: string };
}

export const AdminSetup: React.FC<AdminSetupProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [adminPanelPath, setAdminPanelPath] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validate password on change
  useEffect(() => {
    if (password.length === 0) {
      setPasswordValidation(null);
      return;
    }

    const validatePassword = async () => {
      try {
        const response = await fetch('/api/admin/validate-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        if (response.ok) {
          const validation = await response.json();
          setPasswordValidation(validation);
        }
      } catch {
        // Fallback client-side validation
        const localValidation = localValidatePassword(password);
        setPasswordValidation(localValidation);
      }
    };

    const timeoutId = setTimeout(validatePassword, 300);
    return () => clearTimeout(timeoutId);
  }, [password]);

  const localValidatePassword = (pwd: string): PasswordValidation => {
    const requirements = {
      minLength: pwd.length >= 8,
      hasUppercase: /[A-Z]/.test(pwd),
      hasLowercase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
      notCommon: !['password', '123456', 'admin', 'qwerty'].some(c => pwd.toLowerCase().includes(c)),
    };

    const feedback: string[] = [];
    if (!requirements.minLength) feedback.push('Минимум 8 символов');
    if (!requirements.hasUppercase) feedback.push('Заглавная буква (A-Z)');
    if (!requirements.hasLowercase) feedback.push('Строчная буква (a-z)');
    if (!requirements.hasNumber) feedback.push('Цифра (0-9)');
    if (!requirements.hasSpecial) feedback.push('Спецсимвол (!@#$%^&*)');
    if (!requirements.notCommon) feedback.push('Слишком простой пароль');

    let score = 0;
    score += Math.min(pwd.length * 4, 40);
    if (requirements.hasUppercase) score += 15;
    if (requirements.hasLowercase) score += 15;
    if (requirements.hasNumber) score += 15;
    if (requirements.hasSpecial) score += 15;
    if (!requirements.notCommon) score -= 30;
    score = Math.max(0, Math.min(100, score));

    return {
      isValid: Object.values(requirements).every(r => r === true),
      score,
      requirements,
      feedback,
    };
  };

  const handleStep1Next = () => {
    if (!adminPanelPath.trim()) {
      setError('Укажите путь к админ-панели');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(adminPanelPath)) {
      setError('Только буквы, цифры, дефис и подчёркивание');
      return;
    }
    if (adminPanelPath.length < 3) {
      setError('Минимум 3 символа');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!username.trim()) {
      setError('Укажите имя пользователя');
      return;
    }
    if (username.length < 3) {
      setError('Минимум 3 символа');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Только буквы, цифры и подчёркивание');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleSubmit = async () => {
    setError('');

    if (!passwordValidation?.isValid) {
      setError('Пароль не соответствует требованиям');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          adminPanelPath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Ошибка создания администратора');
        setLoading(false);
        return;
      }

      // Save token
      localStorage.setItem('admin_token', data.token);
      onSuccess(adminPanelPath);
    } catch (err: any) {
      setError(err.message || 'Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (score: number): string => {
    if (score < 30) return 'bg-red-500';
    if (score < 50) return 'bg-orange-500';
    if (score < 70) return 'bg-yellow-500';
    if (score < 90) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  const getStrengthLabel = (score: number): string => {
    if (score < 30) return 'Очень слабый';
    if (score < 50) return 'Слабый';
    if (score < 70) return 'Средний';
    if (score < 90) return 'Сильный';
    return 'Очень сильный';
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
    let pwd = '';
    // Ensure at least one of each type
    pwd += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    pwd += 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)];
    pwd += '23456789'[Math.floor(Math.random() * 8)];
    pwd += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    for (let i = 4; i < 16; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle
    pwd = pwd.split('').sort(() => Math.random() - 0.5).join('');
    setPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-lg w-full">
        <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
              <span className="text-3xl">🛡️</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Первичная настройка</h2>
            <p className="text-gray-400 text-sm mt-1">Создайте администратора для управления сервисом</p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {step > s ? '✓' : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-0.5 transition-all ${step > s ? 'bg-purple-600' : 'bg-gray-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Admin Panel Path */}
          {step === 1 && (
            <div className="space-y-4 animate-in">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  🔗 URL путь к админ-панели
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Придумайте уникальный путь. Это будет адрес вашей админки.
                  Например: <code className="text-purple-400">my-secret-panel</code>
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">{window.location.origin}/</span>
                  <input
                    type="text"
                    value={adminPanelPath}
                    onChange={(e) => setAdminPanelPath(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    placeholder="my-secret-panel"
                    className="flex-1 bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors font-mono"
                    autoFocus
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-300 text-xs">
                  💡 <strong>Совет:</strong> Используйте сложный путь, который трудно угадать. Это дополнительная защита вашей админки.
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleStep1Next}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all"
              >
                Далее →
              </button>
            </div>
          )}

          {/* Step 2: Username */}
          {step === 2 && (
            <div className="space-y-4 animate-in">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  👤 Имя пользователя
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="admin"
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Только буквы, цифры и подчёркивание. Минимум 3 символа.
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(1); setError(''); }}
                  className="flex-1 py-3 border border-gray-600 hover:border-gray-500 text-gray-300 font-medium rounded-xl transition-colors"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleStep2Next}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all"
                >
                  Далее →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Password */}
          {step === 3 && (
            <div className="space-y-4 animate-in">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  🔒 Пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите сложный пароль"
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 pr-20 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors font-mono"
                    autoFocus
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 text-gray-400 hover:text-white transition-colors"
                      title={showPassword ? 'Скрыть' : 'Показать'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="p-1.5 text-gray-400 hover:text-purple-400 transition-colors"
                      title="Сгенерировать"
                    >
                      🎲
                    </button>
                  </div>
                </div>

                {/* Password strength indicator */}
                {passwordValidation && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStrengthColor(passwordValidation.score)}`}
                          style={{ width: `${passwordValidation.score}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordValidation.score < 50 ? 'text-red-400' :
                        passwordValidation.score < 70 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {getStrengthLabel(passwordValidation.score)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { key: 'minLength', label: '8+ символов', met: passwordValidation.requirements.minLength },
                        { key: 'hasUppercase', label: 'Заглавная (A-Z)', met: passwordValidation.requirements.hasUppercase },
                        { key: 'hasLowercase', label: 'Строчная (a-z)', met: passwordValidation.requirements.hasLowercase },
                        { key: 'hasNumber', label: 'Цифра (0-9)', met: passwordValidation.requirements.hasNumber },
                        { key: 'hasSpecial', label: 'Спецсимвол (!@#)', met: passwordValidation.requirements.hasSpecial },
                        { key: 'notCommon', label: 'Не простой', met: passwordValidation.requirements.notCommon },
                      ].map(req => (
                        <div key={req.key} className={`flex items-center gap-1.5 text-xs ${req.met ? 'text-green-400' : 'text-gray-500'}`}>
                          <span>{req.met ? '✓' : '○'}</span>
                          <span>{req.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  🔒 Подтвердите пароль
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите пароль"
                  className={`w-full bg-gray-900/50 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors font-mono ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-500 focus:border-red-400'
                      : confirmPassword && password === confirmPassword
                        ? 'border-green-500 focus:border-green-400'
                        : 'border-gray-600 focus:border-purple-400'
                  }`}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">Пароли не совпадают</p>
                )}
                {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                  <p className="text-green-400 text-xs mt-1">✓ Пароли совпадают</p>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(2); setError(''); }}
                  disabled={loading}
                  className="flex-1 py-3 border border-gray-600 hover:border-gray-500 text-gray-300 font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !passwordValidation?.isValid || password !== confirmPassword}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all"
                >
                  {loading ? 'Создание...' : '🛡️ Создать администратора'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={onCancel}
            className="w-full mt-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Вернуться на главную
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
