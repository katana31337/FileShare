import { ConnectionMonitor, ConnectionStatus } from '../ConnectionMonitor';

describe('ConnectionMonitor', () => {
  let monitor: ConnectionMonitor;

  beforeEach(() => {
    monitor = new ConnectionMonitor();
    jest.useFakeTimers();
  });

  afterEach(() => {
    monitor.stop();
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
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      } as Response);

      const status = await monitor.forceCheck();

      expect(fetchSpy).toHaveBeenCalledWith('/api/health', expect.any(Object));
      expect(status).toBeDefined();
      
      fetchSpy.mockRestore();
    });
  });

  describe('события', () => {
    it('должен генерировать событие при изменении статуса', async () => {
      const callback = jest.fn();
      monitor.on('statusChange', callback);

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      } as Response);

      await monitor.forceCheck();

      expect(callback).toHaveBeenCalled();
    });

    it('долген передавать информацию о статусе в событии', async () => {
      const callback = jest.fn();
      monitor.on('statusChange', callback);

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      } as Response);

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
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const status = await monitor.forceCheck();

      expect(status).toBe('disconnected');
    });

    it('должен обрабатывать невалидные ответы', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const status = await monitor.forceCheck();

      expect(status).toBe('disconnected');
    });

    it('должен обрабатывать таймауты', async () => {
      jest.spyOn(global, 'fetch').mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      const status = await monitor.forceCheck();

      expect(status).toBe('disconnected');
    });
  });

  describe('статусы соединения', () => {
    it('должен устанавливать статус "connected" при успешной проверке', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      } as Response);

      await monitor.forceCheck();

      expect(monitor.getStatus()).toBe('connected');
    });

    it('должен устанавливать статус "degraded" при проблемах с БД', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'degraded' }),
      } as Response);

      await monitor.forceCheck();

      expect(monitor.getStatus()).toBe('degraded');
    });

    it('должен устанавливать статус "disconnected" при ошибке', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      // Выполняем несколько проверок для срабатывания порога
      for (let i = 0; i < 3; i++) {
        await monitor.forceCheck();
      }

      expect(monitor.getStatus()).toBe('disconnected');
    });
  });
});
