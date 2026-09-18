import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareOptions } from '../ShareOptions';

describe('ShareOptions', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    expiresIn: 0,
    maxDownloads: 0,
    password: '',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('должен отображать компонент', () => {
    render(<ShareOptions {...defaultProps} />);
    
    expect(screen.getByText(/Дополнительные настройки/i)).toBeInTheDocument();
  });

  it('должен скрывать настройки по умолчанию', () => {
    render(<ShareOptions {...defaultProps} />);
    
    expect(screen.queryByText(/Время жизни ссылки/i)).not.toBeInTheDocument();
  });

  it('должен показывать настройки при клике', () => {
    render(<ShareOptions {...defaultProps} />);
    
    const toggleButton = screen.getByText(/Дополнительные настройки/i);
    fireEvent.click(toggleButton);
    
    expect(screen.getByText(/Время жизни ссылки/i)).toBeInTheDocument();
    expect(screen.getByText(/Лимит скачиваний/i)).toBeInTheDocument();
    expect(screen.getByText(/Пароль/i)).toBeInTheDocument();
  });

  it('должен вызывать onChange при изменении времени жизни', () => {
    render(<ShareOptions {...defaultProps} />);
    
    const toggleButton = screen.getByText(/Дополнительные настройки/i);
    fireEvent.click(toggleButton);
    
    // Ищем select по роли вместо label
    const selects = screen.getAllByRole('combobox');
    const expirySelect = selects[0]; // Первый select - время жизни
    
    fireEvent.change(expirySelect, { target: { value: '3600' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresIn: 3600,
      })
    );
  });

  it('должен вызывать onChange при изменении лимита скачиваний', () => {
    render(<ShareOptions {...defaultProps} />);
    
    const toggleButton = screen.getByText(/Дополнительные настройки/i);
    fireEvent.click(toggleButton);
    
    // Ищем select по роли вместо label
    const selects = screen.getAllByRole('combobox');
    const downloadsSelect = selects[1]; // Второй select - лимит скачиваний
    
    fireEvent.change(downloadsSelect, { target: { value: '5' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        maxDownloads: 5,
      })
    );
  });

  it('должен вызывать onChange при изменении пароля', () => {
    render(<ShareOptions {...defaultProps} />);
    
    const toggleButton = screen.getByText(/Дополнительные настройки/i);
    fireEvent.click(toggleButton);
    
    // Ищем input по placeholder вместо label
    const passwordInput = screen.getByPlaceholderText(/Оставьте пустым/i);
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        password: 'secret123',
      })
    );
  });

  it('должен отображать опции времени жизни', () => {
    render(<ShareOptions {...defaultProps} />);
    
    const toggleButton = screen.getByText(/Дополнительные настройки/i);
    fireEvent.click(toggleButton);
    
    expect(screen.getByText(/Бессрочно/i)).toBeInTheDocument();
    expect(screen.getByText(/5 минут/i)).toBeInTheDocument();
    expect(screen.getByText(/1 час/i)).toBeInTheDocument();
    expect(screen.getByText(/24 часа/i)).toBeInTheDocument();
    expect(screen.getByText(/7 дней/i)).toBeInTheDocument();
  });

  it('должен отображать опции лимита скачиваний', () => {
    render(<ShareOptions {...defaultProps} />);
    
    const toggleButton = screen.getByText(/Дополнительные настройки/i);
    fireEvent.click(toggleButton);
    
    expect(screen.getByText(/Без ограничений/i)).toBeInTheDocument();
    expect(screen.getByText(/1 раз/i)).toBeInTheDocument();
    expect(screen.getByText(/5 раз/i)).toBeInTheDocument();
    expect(screen.getByText(/10 раз/i)).toBeInTheDocument();
  });

  it('должен сохранять состояние при переключении', () => {
    render(<ShareOptions {...defaultProps} />);
    
    const toggleButton = screen.getByText(/Дополнительные настройки/i);
    
    // Открываем
    fireEvent.click(toggleButton);
    expect(screen.getByText(/Время жизни ссылки/i)).toBeInTheDocument();
    
    // Закрываем
    fireEvent.click(toggleButton);
    expect(screen.queryByText(/Время жизни ссылки/i)).not.toBeInTheDocument();
    
    // Снова открываем
    fireEvent.click(toggleButton);
    expect(screen.getByText(/Время жизни ссылки/i)).toBeInTheDocument();
  });
});
