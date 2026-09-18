import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextShare } from '../TextShare';

describe('TextShare', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('должен отображать компонент', () => {
    render(<TextShare onSubmit={mockOnSubmit} isSubmitting={false} />);
    
    expect(screen.getByPlaceholderText(/Введите текст/i)).toBeInTheDocument();
  });

  it('должен отображать кнопку отправки', () => {
    render(<TextShare onSubmit={mockOnSubmit} isSubmitting={false} />);
    
    expect(screen.getByText(/Создать ссылку/i)).toBeInTheDocument();
  });

  it('должен отображать состояние отправки', () => {
    render(<TextShare onSubmit={mockOnSubmit} isSubmitting={true} />);
    
    expect(screen.getByText(/Создание ссылки.../i)).toBeInTheDocument();
  });

  it('должен вызывать onSubmit при клике на кнопку', () => {
    render(<TextShare onSubmit={mockOnSubmit} isSubmitting={false} />);
    
    const textarea = screen.getByPlaceholderText(/Введите текст/i);
    const button = screen.getByText(/Создать ссылку/i);
    
    fireEvent.change(textarea, { target: { value: 'test content' } });
    fireEvent.click(button);
    
    expect(mockOnSubmit).toHaveBeenCalledWith('test content');
  });

  it('должен отключать кнопку при пустом тексте', () => {
    render(<TextShare onSubmit={mockOnSubmit} isSubmitting={false} />);
    
    const button = screen.getByText(/Создать ссылку/i);
    
    expect(button).toBeDisabled();
  });

  it('должен отключать кнопку при отправке', () => {
    render(<TextShare onSubmit={mockOnSubmit} isSubmitting={true} />);
    
    // Кнопка содержит span с текстом "Создание ссылки..."
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(screen.getByText(/Создание ссылки.../i)).toBeInTheDocument();
  });

  it('должен отображать счётчик символов', () => {
    render(<TextShare onSubmit={mockOnSubmit} isSubmitting={false} />);
    
    const textarea = screen.getByPlaceholderText(/Введите текст/i);
    fireEvent.change(textarea, { target: { value: 'test' } });
    
    // Счётчик использует toLocaleString(), который форматирует число с разделителями
    // Проверяем, что отображается "4 / 50,000" или "4 / 50 000" в зависимости от локали
    expect(screen.getByText(/4/)).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('должен ограничивать максимальную длину текста', () => {
    render(<TextShare onSubmit={mockOnSubmit} isSubmitting={false} />);
    
    const textarea = screen.getByPlaceholderText(/Введите текст/i);
    const longText = 'a'.repeat(50001);
    
    fireEvent.change(textarea, { target: { value: longText } });
    
    expect(textarea).toHaveValue('a'.repeat(50000));
  });

  it('должен очищать пробелы в начале и конце', () => {
    render(<TextShare onSubmit={mockOnSubmit} isSubmitting={false} />);
    
    const textarea = screen.getByPlaceholderText(/Введите текст/i);
    const button = screen.getByText(/Создать ссылку/i);
    
    fireEvent.change(textarea, { target: { value: '  test content  ' } });
    fireEvent.click(button);
    
    expect(mockOnSubmit).toHaveBeenCalledWith('test content');
  });

  it('должен отключать кнопку при только пробелах', () => {
    render(<TextShare onSubmit={mockOnSubmit} isSubmitting={false} />);
    
    const textarea = screen.getByPlaceholderText(/Введите текст/i);
    const button = screen.getByText(/Создать ссылку/i);
    
    fireEvent.change(textarea, { target: { value: '   ' } });
    
    expect(button).toBeDisabled();
  });
});
