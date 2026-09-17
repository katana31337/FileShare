import React, { useState } from 'react';

interface ShareLinkProps {
  shortUrl: string;
  fullUrl: string;
  expiresAt: string | null;
  onReset: () => void;
}

export const ShareLink: React.FC<ShareLinkProps> = ({ shortUrl, fullUrl, expiresAt, onReset }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatExpiry = (dateStr: string | null): string => {
    if (!dateStr) return 'Бессрочно';
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full animate-in">
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/20">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Ссылка создана!</h2>
        <p className="text-gray-400 mt-1">Поделитесь ей с кем угодно</p>
      </div>

      {/* Link box */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-900/50 rounded-lg px-4 py-3 overflow-hidden">
            <p className="text-purple-300 font-mono text-sm truncate">{fullUrl}</p>
          </div>
          <button
            onClick={copyToClipboard}
            className={`px-4 py-3 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Скопировано
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Копировать
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-6">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Истекает: {formatExpiry(expiresAt)}
        </span>
      </div>

      {/* QR Code placeholder */}
      <div className="flex justify-center mb-6">
        <div className="bg-white p-4 rounded-xl">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullUrl)}`}
            alt="QR Code"
            className="w-32 h-32"
          />
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 px-6 border border-gray-600 hover:border-purple-400 text-gray-300 hover:text-white font-medium rounded-xl transition-all duration-300"
      >
        Создать ещё одну ссылку
      </button>
    </div>
  );
};

export default ShareLink;
