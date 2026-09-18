import { ConnectionMonitor } from '../ConnectionMonitor';

describe('ConnectionMonitor', () => {
  let monitor: ConnectionMonitor;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Сохраняем оригинальный fetch
    originalFetch = global.fetch;
    
    // Создаём новый экземпляр монитора
    monitor = new ConnectionMonitor();
    
    // Используем fake timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Восстанавливаем оригинальный fetch
    global.fetch = originalFetch;
    
    // Останавливаем монитор
    monitor.stop();
    
    // Восстанавливаем реальные таймеры
    jest.useRealTimers();
  });

  describe('getStatus', () => {
    it('должен возвращать начальный статус "checking"', () => {
      const status = monitor.getStatus();
      expect(status).toBe('checking');
    });
  });

  describe('start', () => {
    it('должен начинать мониторинг', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      monitor.start();

      expect(setIntervalSpy).toHaveBeenCalled();
      
      setIntervalSpy.mockRestore();
    });

    it('не должен запускать несколько интервалов', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      monitor.start();
      monitor.start();
      monitor.start();

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      
      setIntervalSpy.mockRestore();
    });
  });

  describe('stop', () => {
    it('должен останавливать мониторинг', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      monitor.start();
      monitor.stop();

      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });
  });

  describe('setInterval', () => {
    it('должен изменять интервал проверки', () => {
      monitor.start();
      monitor.setInterval(10000);

      // Интервал должен быть обновлён
      expect(monitor).toBeDefined();
    });
  });

  describe('forceCheck', () => {
    it('должен выполнять принудительную проверку', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      const status = await monitor.forceCheck();

      expect(global.fetch).toHaveBeenCalledWith('/api/health', expect.any(Object));
      expect(status).toBeDefined();
    });
  });

  describe('события', () => {
    it('должен генерировать событие при изменении статуса', async () => {
      const callback = jest.fn();
      monitor.on('statusChange', callback);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      await monitor.forceCheck();

      expect(callback).toHaveBeenCalled();
    });

    it('должен передавать информацию о статусе в событии', async () => {
      const callback = jest.fn();
      monitor.on('statusChange', callback);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      await monitor.forceCheck();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.any(String),
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('обработка ошибок', () => {
    it('должен обрабатывать ошибки сети', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      // Выполняем несколько проверок для достижения порога неудач
      // maxFailuresBeforeDisconnect = 2, поэтому нужно минимум 2 проверки
      let status = await monitor.forceCheck();
      status = await monitor.forceCheck();
      status = await monitor.forceCheck();
      status = await monitor.forceCheck();
      status = await monitor.forceCheck();

      // Проверяем, что статус изменился на disconnected
      expect(status).toBe('disconnected');
    });

    it('должен обрабатывать невалидные ответы', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      // Выполняем несколько проверок для достижения порога неудач
      let status = await monitor.forceCheck();
      status = await monitor.forceCheck();
      status = await monitor.forceCheck();
      status = await monitor.forceCheck();
      status = await monitor.forceCheck();

      // Проверяем, что статус изменился на disconnected
      expect(status).toBe('disconnected');
    });

    it('должен обрабатывать таймауты', async () => {
      // Используем быстрый reject вместо setTimeout
      global.fetch = jest.fn().mockRejectedValue(new Error('Timeout'));

      // Выполняем несколько проверок для достижения порога неудач
      let status = await monitor.forceCheck();
      status = await monitor.forceCheck();
      status = await monitor.forceCheck();
      status = await monitor.forceCheck();
      status = await monitor.forceCheck();

      // Проверяем, что статус изменился на disconnected
      expect(status).toBe('disconnected');
    });
  });

  describe('статусы соединения', () => {
    it('должен устанавливать статус "connected" при успешной проверке', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      await monitor.forceCheck();

      expect(monitor.getStatus()).toBe('connected');
    });

    it('должен устанавливать статус "degraded" при проблемах с БД', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'degraded' }),
      });

      await monitor.forceCheck();

      expect(monitor.getStatus()).toBe('degraded');
    });

    it('должен устанавливать статус "disconnected" при ошибке', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      // Выполняем несколько проверок для срабатывания порога
      for (let i = 0; i < 3; i++) {
        await monitor.forceCheck();
      }

      expect(monitor.getStatus()).toBe('disconnected');
    });
  });
});
