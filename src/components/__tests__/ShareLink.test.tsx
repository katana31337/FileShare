import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareLink } from '../ShareLink';

describe('ShareLink', () => {
  const mockOnReset = jest.fn();
  const defaultProps = {
    shortUrl: '/s/abc123',
    fullUrl: 'https://example.com/s/abc123',
    expiresAt: null,
    onReset: mockOnReset,
  };

  beforeEach(() => {
    mockOnReset.mockClear();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('должен отображать компонент', () => {
    render(<ShareLink {...defaultProps} />);
    
    expect(screen.getByText(/Ссылка создана/i)).toBeInTheDocument();
  });

  it('должен отображать полную ссылку', () => {
    render(<ShareLink {...defaultProps} />);
    
    expect(screen.getByText('https://example.com/s/abc123')).toBeInTheDocument();
  });

  it('должен отображать кнопку копирования', () => {
    render(<ShareLink {...defaultProps} />);
    
    expect(screen.getByText(/Копировать/i)).toBeInTheDocument();
  });

  it('должен копировать ссылку в буфер обмена', async () => {
    render(<ShareLink {...defaultProps} />);
    
    const copyButton = screen.getByText(/Копировать/i);
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/s/abc123');
    });
  });

  it('должен отображать сообщение "Скопировано" после копирования', async () => {
    render(<ShareLink {...defaultProps} />);
    
    const copyButton = screen.getByText(/Копировать/i);
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Скопировано/i)).toBeInTheDocument();
    });
  });

  it('должен отображать QR код', () => {
    render(<ShareLink {...defaultProps} />);
    
    const qrImage = screen.getByAltText(/QR Code/i);
    expect(qrImage).toBeInTheDocument();
    expect(qrImage).toHaveAttribute('src', expect.stringContaining('api.qrserver.com'));
  });

  it('должен отображать информацию о сроке действия', () => {
    const expiresAt = new Date(Date.now() + 86400000).toISOString(); // 24 hours
    render(<ShareLink {...defaultProps} expiresAt={expiresAt} />);
    
    expect(screen.getByText(/Истекает/i)).toBeInTheDocument();
  });

  it('должен отображать "Бессрочно" если срок не установлен', () => {
    render(<ShareLink {...defaultProps} expiresAt={null} />);
    
    expect(screen.getByText(/Бессрочно/i)).toBeInTheDocument();
  });

  it('должен вызывать onReset при клике на кнопку', () => {
    render(<ShareLink {...defaultProps} />);
    
    const resetButton = screen.getByText(/Создать ещё одну ссылку/i);
    fireEvent.click(resetButton);
    
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('должен отображать иконку успеха', () => {
    render(<ShareLink {...defaultProps} />);
    
    const successIcon = screen.getByRole('img', { hidden: true });
    expect(successIcon).toBeInTheDocument();
  });

  it('должен обрабатывать ошибку копирования', async () => {
    // Mock clipboard error
    const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard error'));
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    // Mock document.execCommand для fallback
    document.execCommand = jest.fn();

    render(<ShareLink {...defaultProps} />);
    
    const copyButton = screen.getByText(/Копировать/i);
    fireEvent.click(copyButton);
    
    // Should not crash
    await waitFor(() => {
      expect(copyButton).toBeInTheDocument();
    });
  });
});
