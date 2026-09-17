import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';

interface AdminPanelProps {
  onBack: () => void;
}

type AdminTab = 'settings' | 'shares' | 'stats' | 'security';

interface SettingRecord {
  key: string;
  value: string;
  category: string;
  description: string;
}

const CATEGORIES = [
  { id: 'general', label: '🎨 Основные', icon: '🎨' },
  { id: 'limits', label: '📏 Лимиты', icon: '📏' },
  { id: 'security', label: '🔒 Безопасность', icon: '🔒' },
  { id: 'network', label: '🌐 Сеть', icon: '🌐' },
  { id: 'system', label: '⚙️ Система', icon: '⚙️' },
  { id: 'admin', label: '👤 Админ', icon: '👤' },
];

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('settings');
  const [settings, setSettings] = useState<SettingRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [passwordForm, setPasswordForm] = useState({ old: '', new1: '', new2: '' });

  useEffect(() => {
    loadData();
  }, [activeTab, selectedCategory]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'settings') {
        const s = await adminApi.getSettings();
        setSettings(s);
        const values: Record<string, string> = {};
        s.forEach((setting: SettingRecord) => { values[setting.key] = setting.value; });
        setEditValues(values);
      } else if (activeTab === 'stats') {
        const st = await adminApi.getStats();
        setStats(st);
      } else if (activeTab === 'shares') {
        const sh = await adminApi.getShares(50);
        setShares(sh);
      }
    } catch (err: any) {
      showMessage('error', err.message);
    }
    setLoading(false);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const categorySettings = settings.filter(s => s.category === selectedCategory);
      const updates = categorySettings.map(s => ({
        key: s.key,
        value: editValues[s.key] || s.value,
        category: s.category,
      }));
      await adminApi.updateSettings(updates);
      showMessage('success', 'Настройки сохранены!');
    } catch (err: any) {
      showMessage('error', 'Ошибка сохранения: ' + err.message);
    }
    setSaving(false);
  };

  const handleDeleteShare = async (id: string) => {
    if (!confirm('Удалить этот шар?')) return;
    try {
      await adminApi.deleteShare(id);
      setShares(shares.filter(s => s.id !== id));
      showMessage('success', 'Шар удалён');
    } catch (err: any) {
      showMessage('error', err.message);
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await adminApi.cleanup();
      showMessage('success', `Удалено ${result.deleted} истёкших шаров`);
      loadData();
    } catch (err: any) {
      showMessage('error', err.message);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new1 !== passwordForm.new2) {
      showMessage('error', 'Пароли не совпадают');
      return;
    }
    if (passwordForm.new1.length < 6) {
      showMessage('error', 'Пароль должен быть минимум 6 символов');
      return;
    }
    try {
      await adminApi.changePassword(passwordForm.old, passwordForm.new1);
      showMessage('success', 'Пароль изменён');
      setPasswordForm({ old: '', new1: '', new2: '' });
    } catch (err: any) {
      showMessage('error', err.message);
    }
  };

  const handleLogout = () => {
    adminApi.logout();
    onBack();
  };

  const formatSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredSettings = settings.filter(s => s.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">⚙️</span>
              Панель управления
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-colors"
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Message */}
      {message && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-lg shadow-lg animate-in ${
          message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'settings' as AdminTab, label: '⚙️ Настройки' },
            { id: 'shares' as AdminTab, label: '📦 Шары' },
            { id: 'stats' as AdminTab, label: '📊 Статистика' },
            { id: 'security' as AdminTab, label: '🔐 Безопасность' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Categories sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-2 space-y-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings content */}
            <div className="lg:col-span-3">
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">
                    {CATEGORIES.find(c => c.id === selectedCategory)?.label}
                  </h2>
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    {saving ? 'Сохранение...' : '💾 Сохранить'}
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-gray-400">Загрузка...</div>
                ) : (
                  <div className="space-y-4">
                    {filteredSettings.map(setting => (
                      <div key={setting.key} className="border-b border-gray-700/30 pb-4">
                        <label className="block text-sm text-gray-300 mb-1">
                          {setting.description || setting.key}
                        </label>
                        <p className="text-xs text-gray-500 mb-2 font-mono">{setting.key}</p>
                        {setting.value === 'true' || setting.value === 'false' ? (
                          <button
                            onClick={() => setEditValues({ ...editValues, [setting.key]: editValues[setting.key] === 'true' ? 'false' : 'true' })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              editValues[setting.key] === 'true'
                                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                            }`}
                          >
                            {editValues[setting.key] === 'true' ? '✅ Включено' : '❌ Выключено'}
                          </button>
                        ) : (
                          <input
                            type={setting.key.includes('password') ? 'password' : 'text'}
                            value={editValues[setting.key] || ''}
                            onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shares Tab */}
        {activeTab === 'shares' && (
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Управление шарами</h2>
              <button
                onClick={handleCleanup}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg border border-red-500/30 transition-colors"
              >
                🧹 Очистить истёкшие
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-400">Загрузка...</div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Нет шаров</div>
            ) : (
              <div className="space-y-2">
                {shares.map(share => (
                  <div key={share.id} className="flex items-center gap-4 p-3 bg-gray-900/30 rounded-lg border border-gray-700/30">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      share.type === 'file' ? 'bg-blue-500/20' : 'bg-green-500/20'
                    }`}>
                      {share.type === 'file' ? '📄' : '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {share.file_name || `Текст #${share.id}`}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {share.downloads} скачиваний • {share.file_size ? formatSize(share.file_size) : 'текст'} • {new Date(share.created_at).toLocaleDateString('ru')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteShare(share.id)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-8 text-gray-400">Загрузка...</div>
            ) : stats ? (
              <>
                <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 text-center">
                  <p className="text-3xl font-bold text-purple-400">{stats.totalShares}</p>
                  <p className="text-gray-400 text-sm mt-1">Всего шаров</p>
                </div>
                <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 text-center">
                  <p className="text-3xl font-bold text-green-400">{stats.activeShares}</p>
                  <p className="text-gray-400 text-sm mt-1">Активных</p>
                </div>
                <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 text-center">
                  <p className="text-3xl font-bold text-blue-400">{stats.totalDownloads}</p>
                  <p className="text-gray-400 text-sm mt-1">Скачиваний</p>
                </div>
                <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 text-center">
                  <p className="text-3xl font-bold text-yellow-400">{stats.expiredShares}</p>
                  <p className="text-gray-400 text-sm mt-1">Истёкших</p>
                </div>
                <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 text-center">
                  <p className="text-3xl font-bold text-pink-400">{formatSize(stats.totalStorage)}</p>
                  <p className="text-gray-400 text-sm mt-1">Хранилище</p>
                </div>
                <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 text-center">
                  <p className="text-3xl font-bold text-cyan-400">{stats.dbType}</p>
                  <p className="text-gray-400 text-sm mt-1">База данных</p>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">🔐 Смена пароля</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Текущий пароль</label>
                  <input
                    type="password"
                    value={passwordForm.old}
                    onChange={(e) => setPasswordForm({ ...passwordForm, old: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Новый пароль</label>
                  <input
                    type="password"
                    value={passwordForm.new1}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new1: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Подтвердите новый пароль</label>
                  <input
                    type="password"
                    value={passwordForm.new2}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new2: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
                >
                  Сменить пароль
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
