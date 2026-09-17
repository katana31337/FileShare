import React, { useState, useEffect } from 'react';

interface HistoryItem {
  id: string;
  type: 'file' | 'text';
  shortUrl: string;
  fullUrl: string;
  createdAt: string;
  expiresAt: string | null;
  fileName?: string;
}

const HISTORY_KEY = 'quickshare_history';
const MAX_HISTORY = 10;

export const ShareHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const addToHistory = (item: HistoryItem) => {
    const newHistory = [item, ...history.filter(h => h.id !== item.id)].slice(0, MAX_HISTORY);
    setHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback
    }
  };

  if (history.length === 0) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors text-sm w-full"
      >
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        История ссылок ({history.length})
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-gray-800/30 border border-gray-700/30 rounded-xl hover:border-purple-500/30 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                item.type === 'file' ? 'bg-blue-500/20' : 'bg-green-500/20'
              }`}>
                {item.type === 'file' ? (
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">
                  {item.fileName || `Текст • ${item.id}`}
                </p>
                <p className="text-gray-500 text-xs truncate">{item.fullUrl}</p>
              </div>
              <button
                onClick={() => copyLink(item.fullUrl)}
                className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                title="Копировать"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={clearHistory}
            className="text-red-400 hover:text-red-300 text-xs transition-colors"
          >
            Очистить историю
          </button>
        </div>
      )}
    </div>
  );
};

export const useShareHistory = () => {
  const addToHistory = (item: HistoryItem) => {
    const stored = localStorage.getItem(HISTORY_KEY);
    let history: HistoryItem[] = [];
    if (stored) {
      try {
        history = JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    const newHistory = [item, ...history.filter(h => h.id !== item.id)].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  return { addToHistory };
};

export default ShareHistory;
