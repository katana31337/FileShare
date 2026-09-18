import { RateLimiter } from '../rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(60000, 100); // 1 minute window, 100 requests
  });

  describe('constructor', () => {
    it('должен создавать экземпляр с параметрами по умолчанию', () => {
      const limiter = new RateLimiter();
      expect(limiter).toBeDefined();
    });

    it('должен создавать экземпляр с пользовательскими параметрами', () => {
      const limiter = new RateLimiter(30000, 50);
      expect(limiter).toBeDefined();
    });
  });

  describe('middleware', () => {
    it('должен пропускать запросы в пределах лимита', () => {
      const req = {
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      } as any;

      const next = jest.fn();

      rateLimiter.middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    });

    it('должен блокировать запросы при превышении лимита', () => {
      const req = {
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      } as any;

      const next = jest.fn();

      // Превышаем лимит
      for (let i = 0; i < 101; i++) {
        rateLimiter.middleware(req, res, next);
      }

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'RATE_LIMIT',
        })
      );
    });

    it('должен отслеживать разные IP отдельно', () => {
      const req1 = {
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as any;

      const req2 = {
        ip: '192.168.1.1',
        socket: { remoteAddress: '192.168.1.1' },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      } as any;

      const next = jest.fn();

      // Превышаем лимит для первого IP
      for (let i = 0; i < 101; i++) {
        rateLimiter.middleware(req1, res, next);
      }

      // Второй IP должен работать нормально
      next.mockClear();
      rateLimiter.middleware(req2, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
