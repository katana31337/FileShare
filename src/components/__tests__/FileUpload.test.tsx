import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../FileUpload';

describe('FileUpload', () => {
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    mockOnFileSelect.mockClear();
  });

  it('должен отображать компонент', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    expect(screen.getByText(/Перетащите файл сюда/i)).toBeInTheDocument();
  });

  it('должен отображать сообщение о загрузке', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={true} />);
    
    expect(screen.getByText(/Загрузка.../i)).toBeInTheDocument();
  });

  it('должен вызывать onFileSelect при выборе файла', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('должен отображать информацию о выбранном файле', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByText(/13 B/i)).toBeInTheDocument();
  });

  it('должен отображать кнопку удаления файла', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(screen.getByText(/Удалить файл/i)).toBeInTheDocument();
  });

  it('должен удалять файл при клике на кнопку удаления', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText(/Удалить файл/i));
    
    expect(screen.getByText(/Перетащите файл сюда/i)).toBeInTheDocument();
  });

  it('должен обрабатывать drag and drop', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const dropZone = screen.getByText(/Перетащите файл сюда/i).closest('div');
    
    if (dropZone) {
      fireEvent.dragEnter(dropZone, { dataTransfer: { files: [file] } });
      fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    }
  });

  it('должен отображать максимальный размер файла', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} maxFileSize={10 * 1024 * 1024} />);
    
    expect(screen.getByText(/10 MB/i)).toBeInTheDocument();
  });

  it('должен отклонять файлы больше максимального размера', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} isUploading={false} maxFileSize={10} />);
    
    const file = new File(['test content'], 'large.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 100 });
    
    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(screen.getByText(/Файл слишком большой/i)).toBeInTheDocument();
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });
});
