import React, { useState } from 'react';

interface ShareOptionsProps {
  expiresIn: number;
  maxDownloads: number;
  password: string;
  onChange: (options: { expiresIn: number; maxDownloads: number; password: string }) => void;
}

const EXPIRY_OPTIONS = [
  { value: 0, label: 'Бессрочно' },
  { value: 300, label: '5 минут' },
  { value: 3600, label: '1 час' },
  { value: 86400, label: '24 часа' },
  { value: 604800, label: '7 дней' },
  { value: 2592000, label: '30 дней' },
];

const DOWNLOAD_OPTIONS = [
  { value: 0, label: 'Без ограничений' },
  { value: 1, label: '1 раз' },
  { value: 5, label: '5 раз' },
  { value: 10, label: '10 раз' },
  { value: 50, label: '50 раз' },
  { value: 100, label: '100 раз' },
];

export const ShareOptions: React.FC<ShareOptionsProps> = ({
  expiresIn,
  maxDownloads,
  password,
  onChange,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors text-sm"
      >
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Дополнительные настройки
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 animate-in">
          {/* Expiry */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              ⏰ Время жизни ссылки
            </label>
            <select
              value={expiresIn}
              onChange={(e) => onChange({ ...{ expiresIn: Number(e.target.value), maxDownloads, password } })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max downloads */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              📥 Лимит скачиваний
            </label>
            <select
              value={maxDownloads}
              onChange={(e) => onChange({ ...{ expiresIn, maxDownloads: Number(e.target.value), password } })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
            >
              {DOWNLOAD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              🔒 Пароль (необязательно)
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => onChange({ ...{ expiresIn, maxDownloads, password: e.target.value } })}
              placeholder="Оставьте пустым для открытого доступа"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareOptions;
