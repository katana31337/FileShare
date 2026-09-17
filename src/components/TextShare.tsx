import React, { useState } from 'react';

interface TextShareProps {
  onSubmit: (text: string) => void;
  isSubmitting: boolean;
}

export const TextShare: React.FC<TextShareProps> = ({ onSubmit, isSubmitting }) => {
  const [text, setText] = useState('');
  const charCount = text.length;
  const maxChars = 50000;

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
    }
  };

  return (
    <div className="w-full">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, maxChars))}
          placeholder="Введите текст, код, заметку или любую информацию для обмена..."
          className="w-full h-48 bg-gray-800/50 border border-gray-600 rounded-2xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
        />
        <div className="absolute bottom-3 right-3 text-xs text-gray-500">
          {charCount.toLocaleString()} / {maxChars.toLocaleString()}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!text.trim() || isSubmitting}
        className="mt-4 w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Создание ссылки...
          </span>
        ) : (
          'Создать ссылку'
        )}
      </button>
    </div>
  );
};

export default TextShare;
