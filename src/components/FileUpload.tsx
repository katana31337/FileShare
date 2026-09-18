import React, { useState, useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  maxFileSize?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isUploading, maxFileSize = 100 * 1024 * 1024 }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): boolean => {
    if (file.size > maxFileSize) {
      setError(`Файл слишком большой. Максимальный размер: ${formatSize(maxFileSize)}`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer
          ${error
            ? 'border-red-400 bg-red-500/10'
            : dragActive
              ? 'border-purple-400 bg-purple-500/10 scale-[1.02]'
              : selectedFile
                ? 'border-green-400 bg-green-500/10'
                : 'border-gray-600 hover:border-purple-400 hover:bg-purple-500/5'
          }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
        />

        {error ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-red-400 font-medium text-lg">Ошибка</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setError(null);
              }}
              className="text-gray-400 hover:text-white text-sm underline"
            >
              Попробовать снова
            </button>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium text-lg">{selectedFile.name}</p>
              <p className="text-gray-400 text-sm">{formatSize(selectedFile.size)}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="text-red-400 hover:text-red-300 text-sm underline"
            >
              Удалить файл
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${dragActive ? 'bg-purple-500/20' : 'bg-gray-700/50'}`}>
              <svg className={`w-8 h-8 ${dragActive ? 'text-purple-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium text-lg">
                {dragActive ? 'Отпустите файл' : 'Перетащите файл сюда'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                или нажмите для выбора • Макс. {formatSize(maxFileSize)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
