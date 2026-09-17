import React, { useState, useEffect } from 'react';
import { ShareDownload } from '../types';
import { shareService } from '../services/shareService';
import { ConnectionBanner } from './ConnectionBanner';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

interface DownloadPageProps {
  shareId: string;
}

export const DownloadPage: React.FC<DownloadPageProps> = ({ shareId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareDownload | null>(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const { isDisconnected } = useConnectionStatus();

  useEffect(() => {
    loadShare();
  }, [shareId]);

  const loadShare = async (pwd?: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await shareService.downloadShare(shareId, pwd);
      setShareData(data);
    } catch (err: any) {
      if (err.message?.includes('password') || err.message?.includes('Password')) {
        setNeedsPassword(true);
      } else {
        setError(err.message || 'Failed to load share');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (password.trim()) {
      loadShare(password.trim());
    }
  };

  const handleDownload = () => {
    if (!shareData?.data || !shareData.info) return;

    if (shareData.info.type === 'file') {
      // Download file
      const link = document.createElement('a');
      link.href = shareData.data;
      link.download = shareData.info.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Copy text to clipboard
      navigator.clipboard.writeText(shareData.data);
    }
  };

  const formatSize = (bytes?: number): string => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ConnectionBanner />
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center mb-4 animate-pulse">
            <svg className="w-8 h-8 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ConnectionBanner />
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Ошибка</h2>
          <p className="text-gray-400">{error}</p>
          {isDisconnected && (
            <p className="text-yellow-400 text-sm mt-2">
              Сервер недоступен. Попробуйте позже.
            </p>
          )}
          <a
            href="/"
            className="inline-block mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors"
          >
            На главную
          </a>
        </div>
      </div>
    );
  }

  if (needsPassword && !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 w-full">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Требуется пароль</h2>
            <p className="text-gray-400 mt-1">Этот контент защищён паролем</p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Введите пароль"
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={handlePasswordSubmit}
              disabled={!password.trim()}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              Получить доступ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!shareData) return null;

  const { info } = shareData;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <ConnectionBanner />
      <div className="max-w-lg mx-auto px-4 w-full">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
            {info.type === 'file' ? (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white">
            {info.type === 'file' ? 'Файл готов к скачиванию' : 'Текстовый контент'}
          </h2>
        </div>

        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 space-y-4">
          {info.type === 'file' ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">{info.fileName}</p>
                  <p className="text-gray-400 text-sm">{formatSize(info.fileSize)}</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                ⬇️ Скачать файл
              </button>
            </>
          ) : (
            <>
              <div className="bg-gray-900/50 rounded-xl p-4 max-h-64 overflow-y-auto">
                <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                  {shareData.data}
                </pre>
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                📋 Скопировать текст
              </button>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
          >
            ← Создать свою ссылку
          </a>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
