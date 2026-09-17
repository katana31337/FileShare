import React, { useState, useEffect, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { TextShare } from './components/TextShare';
import { ShareOptions } from './components/ShareOptions';
import { ShareLink } from './components/ShareLink';
import { DownloadPage } from './components/DownloadPage';
import { ShareHistory, useShareHistory } from './components/ShareHistory';
import { AdminPanel } from './components/admin/AdminPanel';
import { AdminLogin } from './components/admin/AdminLogin';
import { ConnectionBanner } from './components/ConnectionBanner';
import { shareService } from './services/shareService';
import { adminApi } from './services/adminApi';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { ShareCreateResponse, ShareType } from './types';

type AppState = 'home' | 'result' | 'download' | 'admin-login' | 'admin-panel';

interface SiteConfig {
  name: string;
  description: string;
  icon: string;
  logoUrl: string;
  primaryColor: string;
}

function App() {
  const [appState, setAppState] = useState<AppState>('home');
  const [shareType, setShareType] = useState<ShareType>('file'); // File is default now
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shareResult, setShareResult] = useState<ShareCreateResponse | null>(null);
  const [shareId, setShareId] = useState<string>('');
  const [options, setOptions] = useState({
    expiresIn: 0,
    maxDownloads: 0,
    password: '',
  });
  const { addToHistory } = useShareHistory();
  const { status, isConnected, isDisconnected, isDegraded } = useConnectionStatus();
  const isServerOnline = isConnected;
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    name: 'QuickShare',
    description: 'Анонимный обмен файлами и текстом',
    icon: '🔗',
    logoUrl: '',
    primaryColor: '#9333ea',
  });

  useEffect(() => {
    // Check if we're on a share URL
    const path = window.location.pathname;
    const shareMatch = path.match(/^\/s\/([A-Za-z0-9]+)/);
    if (shareMatch) {
      setShareId(shareMatch[1]);
      setAppState('download');
      return;
    }

    // Check if we're on admin URL
    if (path === '/admin') {
      if (adminApi.isAuthenticated()) {
        setAppState('admin-panel');
      } else {
        setAppState('admin-login');
      }
      return;
    }

    // Load site config from server
    loadSiteConfig();
  }, []);

  const loadSiteConfig = async () => {
    try {
      const config = await adminApi.getPublicConfig();
      if (config && config.name) {
        setSiteConfig({
          name: config.name || 'QuickShare',
          description: config.description || 'Анонимный обмен файлами и текстом',
          icon: config.icon || '🔗',
          logoUrl: config.logoUrl || '',
          primaryColor: config.primaryColor || '#9333ea',
        });
        // Update document title
        document.title = config.name || 'QuickShare';
      }
    } catch {
      // Use defaults if server unavailable
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleTextSubmit = async (text: string) => {
    setIsSubmitting(true);
    try {
      const result = await shareService.createShare({
        type: 'text',
        content: text,
        expiresIn: options.expiresIn || undefined,
        maxDownloads: options.maxDownloads || undefined,
        password: options.password || undefined,
      });
      setShareResult(result);
      setAppState('result');
      addToHistory({
        id: result.id,
        type: 'text',
        shortUrl: result.shortUrl,
        fullUrl: result.fullUrl,
        createdAt: result.createdAt,
        expiresAt: result.expiresAt,
      });
    } catch (err: any) {
      alert('Ошибка: ' + (err.message || 'Не удалось создать ссылку'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSubmit = async () => {
    if (!selectedFile) return;
    setIsSubmitting(true);

    try {
      const result = await shareService.uploadFile(selectedFile, {
        expiresIn: options.expiresIn || undefined,
        maxDownloads: options.maxDownloads || undefined,
        password: options.password || undefined,
      });
      setShareResult(result);
      setAppState('result');
      addToHistory({
        id: result.id,
        type: 'file',
        shortUrl: result.shortUrl,
        fullUrl: result.fullUrl,
        createdAt: result.createdAt,
        expiresAt: result.expiresAt,
        fileName: selectedFile.name,
      });
    } catch (err: any) {
      alert('Ошибка: ' + (err.message || 'Не удалось загрузить файл'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setAppState('home');
    setSelectedFile(null);
    setShareResult(null);
    setOptions({ expiresIn: 0, maxDownloads: 0, password: '' });
    window.history.pushState({}, '', '/');
  };

  const handleAdminLoginSuccess = () => {
    setAppState('admin-panel');
    window.history.pushState({}, '', '/admin');
  };

  const handleAdminBack = () => {
    setAppState('home');
    window.history.pushState({}, '', '/');
  };

  // Admin login page
  if (appState === 'admin-login') {
    return <AdminLogin onSuccess={handleAdminLoginSuccess} onCancel={handleReset} />;
  }

  // Admin panel
  if (appState === 'admin-panel') {
    return <AdminPanel onBack={handleAdminBack} />;
  }

  // Download page
  if (appState === 'download') {
    return (
      <div className="min-h-screen bg-gray-900">
        <DownloadPage shareId={shareId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Connection Banner */}
      <ConnectionBanner />

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={handleReset} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
              {siteConfig.logoUrl ? (
                <img src={siteConfig.logoUrl} alt="" className="w-6 h-6 rounded" />
              ) : (
                <span className="text-xl">{siteConfig.icon}</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{siteConfig.name}</h1>
              <p className="text-xs text-gray-500">{siteConfig.description}</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
              isConnected
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : isDegraded
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  : isDisconnected
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400 animate-pulse' : isDegraded ? 'bg-yellow-400 animate-pulse' : isDisconnected ? 'bg-red-400' : 'bg-gray-400'
              }`} />
              {isConnected ? 'Сервер онлайн' : isDegraded ? 'Проблемы' : isDisconnected ? 'Оффлайн' : 'Проверка...'}
            </div>

            {/* Admin button */}
            <button
              onClick={() => {
                if (adminApi.isAuthenticated()) {
                  setAppState('admin-panel');
                  window.history.pushState({}, '', '/admin');
                } else {
                  setAppState('admin-login');
                  window.history.pushState({}, '', '/admin');
                }
              }}
              className="p-2 text-gray-400 hover:text-purple-400 transition-colors rounded-lg hover:bg-gray-800/50"
              title="Панель управления"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {appState === 'result' && shareResult ? (
          <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl">
            <ShareLink
              shortUrl={shareResult.shortUrl}
              fullUrl={shareResult.fullUrl}
              expiresAt={shareResult.expiresAt}
              onReset={handleReset}
            />
          </div>
        ) : (
          <>
            <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl">
              {/* Title */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Поделитесь мгновенно
                </h2>
                <p className="text-gray-400">
                  {siteConfig.description}
                </p>
              </div>

              {/* Type selector — File is default/first */}
              <div className="flex gap-2 mb-6 p-1 bg-gray-900/50 rounded-xl">
                <button
                  onClick={() => setShareType('file')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                    shareType === 'file'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Файл
                </button>
                <button
                  onClick={() => setShareType('text')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                    shareType === 'text'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Текст
                </button>
              </div>

              {/* Content area */}
              <div className="mb-6">
                {shareType === 'file' ? (
                  <div className="space-y-4">
                    <FileUpload onFileSelect={handleFileSelect} isUploading={isSubmitting} />
                    <button
                      onClick={handleFileSubmit}
                      disabled={!selectedFile || isSubmitting}
                      className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Загрузка...
                        </span>
                      ) : (
                        '🚀 Создать ссылку'
                      )}
                    </button>
                  </div>
                ) : (
                  <TextShare
                    onSubmit={handleTextSubmit}
                    isSubmitting={isSubmitting}
                  />
                )}
              </div>

              {/* Options */}
              <ShareOptions
                expiresIn={options.expiresIn}
                maxDownloads={options.maxDownloads}
                password={options.password}
                onChange={setOptions}
              />
            </div>

            {/* History */}
            <ShareHistory />

            {/* Offline notice */}
            {isDisconnected && (
              <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <h3 className="text-yellow-400 font-medium mb-1">Локальный режим</h3>
                    <p className="text-yellow-200/70 text-sm">
                      Сервер недоступен. Вы можете создавать ссылки, но они будут работать только в этом браузере.
                      Ссылки не будут доступны другим пользователям. Когда сервер станет доступен, баннер исчезнет автоматически.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Degraded mode notice */}
            {isDegraded && (
              <div className="mt-6 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🔶</div>
                  <div>
                    <h3 className="text-orange-400 font-medium mb-1">Ограниченный режим</h3>
                    <p className="text-orange-200/70 text-sm">
                      Сервер работает, но наблюдаются проблемы с базой данных. Некоторые функции могут быть недоступны.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/30 border border-gray-700/30 rounded-2xl p-5 text-center hover:border-purple-500/30 transition-colors">
                <div className="text-3xl mb-2">🔒</div>
                <h3 className="text-white font-medium mb-1">Анонимно</h3>
                <p className="text-gray-500 text-sm">Без регистрации и авторизации</p>
              </div>
              <div className="bg-gray-800/30 border border-gray-700/30 rounded-2xl p-5 text-center hover:border-purple-500/30 transition-colors">
                <div className="text-3xl mb-2">⚡</div>
                <h3 className="text-white font-medium mb-1">Быстро</h3>
                <p className="text-gray-500 text-sm">Мгновенная генерация ссылок</p>
              </div>
              <div className="bg-gray-800/30 border border-gray-700/30 rounded-2xl p-5 text-center hover:border-purple-500/30 transition-colors">
                <div className="text-3xl mb-2">🛡️</div>
                <h3 className="text-white font-medium mb-1">Безопасно</h3>
                <p className="text-gray-500 text-sm">Шифрование и автоудаление</p>
              </div>
            </div>

            {/* How it works */}
            <div className="mt-8 bg-gray-800/20 border border-gray-700/30 rounded-2xl p-6">
              <h3 className="text-white font-semibold text-lg mb-4 text-center">Как это работает?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                    <span className="text-purple-400 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Загрузите файл или введите текст</p>
                    <p className="text-gray-500 text-sm">Выберите тип контента и загрузите его</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                    <span className="text-purple-400 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Настройте параметры</p>
                    <p className="text-gray-500 text-sm">Срок жизни, лимит скачиваний, пароль</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                    <span className="text-purple-400 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Поделитесь ссылкой</p>
                    <p className="text-gray-500 text-sm">Отправьте короткую ссылку получателю</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              {siteConfig.name} • SOLID Architecture • v2.0
            </p>
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <span className="flex items-center gap-1">
                <span className="text-green-400">●</span> End-to-end
              </span>
              <span className="flex items-center gap-1">
                <span className="text-purple-400">●</span> No tracking
              </span>
              <span className="flex items-center gap-1">
                <span className="text-blue-400">●</span> Multi-DB
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
