import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareHistory } from '../ShareHistory';

describe('ShareHistory', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('должен отображать компонент', () => {
    render(<ShareHistory />);
    
    // Component should render without errors
    expect(document.body).toBeInTheDocument();
  });

  it('должен скрывать историю если она пуста', () => {
    render(<ShareHistory />);
    
    expect(screen.queryByText(/История ссылок/i)).not.toBeInTheDocument();
  });

  it('должен отображать историю если есть записи', () => {
    // Add test data to localStorage
    const history = [
      {
        id: 'test-id',
        type: 'text',
        shortUrl: '/s/abc123',
        fullUrl: 'https://example.com/s/abc123',
        createdAt: new Date().toISOString(),
        expiresAt: null,
      },
    ];
    localStorage.setItem('quickshare_history', JSON.stringify(history));

    render(<ShareHistory />);
    
    expect(screen.getByText(/История ссылок/i)).toBeInTheDocument();
  });

  it('должен отображать количество записей', () => {
    const history = [
      {
        id: 'test-id-1',
        type: 'text',
        shortUrl: '/s/abc123',
        fullUrl: 'https://example.com/s/abc123',
        createdAt: new Date().toISOString(),
        expiresAt: null,
      },
      {
        id: 'test-id-2',
        type: 'file',
        shortUrl: '/s/def456',
        fullUrl: 'https://example.com/s/def456',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        fileName: 'test.pdf',
      },
    ];
    localStorage.setItem('quickshare_history', JSON.stringify(history));

    render(<ShareHistory />);
    
    expect(screen.getByText(/История ссылок \(2\)/i)).toBeInTheDocument();
  });

  it('должен скрывать детали при первом рендере', () => {
    const history = [
      {
        id: 'test-id',
        type: 'text',
        shortUrl: '/s/abc123',
        fullUrl: 'https://example.com/s/abc123',
        createdAt: new Date().toISOString(),
        expiresAt: null,
      },
    ];
    localStorage.setItem('quickshare_history', JSON.stringify(history));

    render(<ShareHistory />);
    
    expect(screen.queryByText('https://example.com/s/abc123')).not.toBeInTheDocument();
  });

  it('должен показывать детали при клике', () => {
    const history = [
      {
        id: 'test-id',
        type: 'text',
        shortUrl: '/s/abc123',
        fullUrl: 'https://example.com/s/abc123',
        createdAt: new Date().toISOString(),
        expiresAt: null,
      },
    ];
    localStorage.setItem('quickshare_history', JSON.stringify(history));

    render(<ShareHistory />);
    
    const toggleButton = screen.getByText(/История ссылок/i);
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('https://example.com/s/abc123')).toBeInTheDocument();
  });

  it('должен отображать иконку файла для файловых шаров', () => {
    const history = [
      {
        id: 'test-id',
        type: 'file',
        shortUrl: '/s/abc123',
        fullUrl: 'https://example.com/s/abc123',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        fileName: 'test.pdf',
      },
    ];
    localStorage.setItem('quickshare_history', JSON.stringify(history));

    render(<ShareHistory />);
    
    const toggleButton = screen.getByText(/История ссылок/i);
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('должен отображать кнопку очистки истории', () => {
    const history = [
      {
        id: 'test-id',
        type: 'text',
        shortUrl: '/s/abc123',
        fullUrl: 'https://example.com/s/abc123',
        createdAt: new Date().toISOString(),
        expiresAt: null,
      },
    ];
    localStorage.setItem('quickshare_history', JSON.stringify(history));

    render(<ShareHistory />);
    
    const toggleButton = screen.getByText(/История ссылок/i);
    fireEvent.click(toggleButton);
    
    expect(screen.getByText(/Очистить историю/i)).toBeInTheDocument();
  });

  it('должен очищать историю при клике на кнопку очистки', () => {
    const history = [
      {
        id: 'test-id',
        type: 'text',
        shortUrl: '/s/abc123',
        fullUrl: 'https://example.com/s/abc123',
        createdAt: new Date().toISOString(),
        expiresAt: null,
      },
    ];
    localStorage.setItem('quickshare_history', JSON.stringify(history));

    render(<ShareHistory />);
    
    const toggleButton = screen.getByText(/История ссылок/i);
    fireEvent.click(toggleButton);
    
    const clearButton = screen.getByText(/Очистить историю/i);
    fireEvent.click(clearButton);
    
    expect(localStorage.getItem('quickshare_history')).toBeNull();
  });

  it('должен копировать ссылку при клике на кнопку копирования', async () => {
    const history = [
      {
        id: 'test-id',
        type: 'text',
        shortUrl: '/s/abc123',
        fullUrl: 'https://example.com/s/abc123',
        createdAt: new Date().toISOString(),
        expiresAt: null,
      },
    ];
    localStorage.setItem('quickshare_history', JSON.stringify(history));

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(<ShareHistory />);
    
    const toggleButton = screen.getByText(/История ссылок/i);
    fireEvent.click(toggleButton);
    
    const copyButton = screen.getByTitle(/Копировать/i);
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/s/abc123');
    });
  });

  it('должен ограничивать историю до 10 записей', () => {
    const history = Array.from({ length: 15 }, (_, i) => ({
      id: `test-id-${i}`,
      type: 'text',
      shortUrl: `/s/abc${i}`,
      fullUrl: `https://example.com/s/abc${i}`,
      createdAt: new Date().toISOString(),
      expiresAt: null,
    }));
    localStorage.setItem('quickshare_history', JSON.stringify(history));

    render(<ShareHistory />);
    
    const toggleButton = screen.getByText(/История ссылок/i);
    fireEvent.click(toggleButton);
    
    // Should only show 10 items - проверяем количество элементов
    const items = screen.getAllByText(/https:\/\/example\.com\/s\/abc/i);
    expect(items.length).toBe(10);
  });
});
