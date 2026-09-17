import { Request, Response, NextFunction } from 'express';

/**
 * Rate Limiter Middleware - Single Responsibility
 * Limits requests per IP to prevent abuse.
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Cleanup expired entries
    setInterval(() => this.cleanup(), this.windowMs);
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!this.store[ip] || this.store[ip].resetTime < now) {
      this.store[ip] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
    } else {
      this.store[ip].count++;
    }

    if (this.store[ip].count > this.maxRequests) {
      res.status(429).json({
        error: 'RATE_LIMIT',
        message: 'Too many requests. Please try again later.',
      });
      return;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - this.store[ip].count));
    res.setHeader('X-RateLimit-Reset', this.store[ip].resetTime);

    next();
  };

  private cleanup(): void {
    const now = Date.now();
    for (const ip of Object.keys(this.store)) {
      if (this.store[ip].resetTime < now) {
        delete this.store[ip];
      }
    }
  }
}

export const rateLimiter = new RateLimiter();
export default RateLimiter;
