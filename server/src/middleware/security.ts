import { Request, Response, NextFunction } from 'express';

/**
 * Request Logger Middleware
 * Logs all incoming requests for monitoring and debugging.
 */
export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  // Log request
  console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} from ${ip}`);

  // Log response time on finish
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} ${_res.statusCode} ${duration}ms`);
  });

  next();
};

/**
 * Security Headers Middleware
 * Adds additional security headers to responses.
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};

export default { requestLogger, securityHeaders };
