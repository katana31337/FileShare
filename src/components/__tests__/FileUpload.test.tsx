import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../FileUpload';

describe('FileUpload', () => {
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    mockOnFileSelect.mockClear();
  });

  it('должен отображать компонент с начальным состоянием', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    expect(screen.getByText(/Перетащите файл сюда/i)).toBeInTheDocument();
    expect(screen.getByText(/или нажмите для выбора/i)).toBeInTheDocument();
  });

  it('должен отображать максимальный размер файла', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} maxFileSize={10 * 1024 * 1024} />);
    
    expect(screen.getByText(/Макс\. 10 MB/i)).toBeInTheDocument();
  });

  it('должен иметь скрытый input для выбора файла', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('hidden');
  });

  it('должен вызывать onFileSelect при выборе файла', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('должен отображать информацию о выбранном файле', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    
    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByText(/13 B/i)).toBeInTheDocument();
  });

  it('должен отображать кнопку удаления файла', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    
    expect(screen.getByText(/Удалить файл/i)).toBeInTheDocument();
  });

  it('должен удалять файл при клике на кнопку удаления', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    fireEvent.click(screen.getByText(/Удалить файл/i));
    
    expect(screen.getByText(/Перетащите файл сюда/i)).toBeInTheDocument();
  });

  it('должен отклонять файлы больше максимального размера', () => {
    const { container } = render(
      <FileUpload onFileSelect={mockOnFileSelect} isUploading={false} maxFileSize={10} />
    );
    
    const file = new File(['test content'], 'large.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 100 });
    
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    
    expect(screen.getByText(/Файл слишком большой/i)).toBeInTheDocument();
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('должен обрабатывать drag and drop', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const dropZone = container.querySelector('.cursor-pointer') as HTMLElement;
    
    Object.defineProperty(file, 'size', { value: 100 });
    
    fireEvent.dragEnter(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });
    
    expect(dropZone).toHaveClass('border-purple-400');
    
    fireEvent.dragLeave(dropZone);
    
    expect(dropZone).not.toHaveClass('border-purple-400');
  });

  it('должен загружать файл через drag and drop', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const dropZone = container.querySelector('.cursor-pointer') as HTMLElement;
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });
    
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    expect(screen.getByText('test.txt')).toBeInTheDocument();
  });

  it('должен открывать диалог выбора файла при клике на drop zone', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, 'click');
    
    const dropZone = container.querySelector('.cursor-pointer') as HTMLElement;
    fireEvent.click(dropZone);
    
    expect(clickSpy).toHaveBeenCalled();
  });
});
