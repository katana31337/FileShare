import React from 'react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

/**
 * ConnectionBanner — Displays connection status banner.
 * Shows warnings/errors when backend is unavailable.
 */
export const ConnectionBanner: React.FC = () => {
  const { status, isDisconnected, isDegraded, forceCheck } = useConnectionStatus();

  if (status === 'connected' || status === 'checking') {
    return null;
  }

  if (isDisconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Сервер недоступен</p>
              <p className="text-sm text-red-100">
                Работает локальный режим. Функционал ограничен.
              </p>
            </div>
          </div>
          <button
            onClick={forceCheck}
            className="px-4 py-2 bg-red-500 hover:bg-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            Проверить снова
          </button>
        </div>
      </div>
    );
  }

  if (isDegraded) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Проблемы с подключением</p>
              <p className="text-sm text-yellow-100">
                Сервер работает, но наблюдаются проблемы. Некоторые функции могут быть недоступны.
              </p>
            </div>
          </div>
          <button
            onClick={forceCheck}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 rounded-lg text-sm font-medium transition-colors"
          >
            Обновить
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ConnectionBanner;
