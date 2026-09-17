import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import sharesRouter from './routes/shares';
import { shareService } from './services/ShareService';
import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger, securityHeaders } from './middleware/security';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(securityHeaders);

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// Rate limiting
app.use('/api/', rateLimiter.middleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/shares', sharesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  const stats = shareService.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    stats,
  });
});

// Serve static frontend in production
const frontendPath = path.join(__dirname, '../../dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'NOT_FOUND', message: 'API endpoint not found' });
    }
  });
}

// 404 handler for API
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'API endpoint not found' });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
function startServer() {
  // Check for HTTPS certificates
  const certPath = process.env.SSL_CERT || path.join(process.cwd(), 'certs', 'cert.pem');
  const keyPath = process.env.SSL_KEY || path.join(process.cwd(), 'certs', 'key.pem');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const httpsOptions = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };

    const server = https.createServer(httpsOptions, app);
    server.listen(Number(PORT), HOST, () => {
      console.log('');
      console.log('  🔗 QuickShare Server');
      console.log('  ═══════════════════');
      console.log(`  🌐 HTTPS: https://${HOST}:${PORT}`);
      console.log(`  📁 Data:  ${path.join(process.cwd(), 'data')}`);
      console.log(`  🔒 SSL:   Enabled`);
      console.log('');
    });
  } else {
    const server = http.createServer(app);
    server.listen(Number(PORT), HOST, () => {
      console.log('');
      console.log('  🔗 QuickShare Server');
      console.log('  ═══════════════════');
      console.log(`  🌐 HTTP:  http://${HOST}:${PORT}`);
      console.log(`  📁 Data:  ${path.join(process.cwd(), 'data')}`);
      console.log(`  🔒 SSL:   Disabled (add certs to ./certs/)`);
      console.log('');
      console.log('  💡 Run ./generate-certs.sh for HTTPS support');
      console.log('');
    });
  }
}

startServer();

export default app;
