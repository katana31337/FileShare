import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import sharesRouter from './routes/shares';
import adminRouter from './routes/admin';
import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger, securityHeaders } from './middleware/security';
import { initializeDatabase, getDatabase } from './db/database';
import { SettingsService } from './services/SettingsService';
import { AuthService } from './services/AuthService';

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
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (applied after DB init)
let rateLimitMiddleware: any = null;

// API Routes
app.use('/api/shares', sharesRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    const db = getDatabase();
    const stats = await db.getStats();
    const isHealthy = await db.isHealthy();
    res.json({
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      dbType: stats.dbType,
      stats,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Serve static frontend in production
const frontendPath = path.join(__dirname, '../../dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  
  // SPA fallback - serve index.html for all non-API routes
  // This allows dynamic admin panel paths
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
async function startServer() {
  try {
    // Initialize database
    const db = await initializeDatabase();

    // Initialize settings service
    const settingsService = new SettingsService(db);
    await settingsService.loadCache();

    // Set admin panel path from environment variable if provided (first run)
    const adminPanelPath = process.env.ADMIN_PANEL_PATH;
    if (adminPanelPath) {
      const currentPath = await settingsService.get('admin_panel_path');
      if (!currentPath || currentPath === 'admin') {
        await settingsService.set('admin_panel_path', adminPanelPath, 'admin', 'URL путь к админ-панели');
        console.log(`🔐 Admin panel path set to: /${adminPanelPath}`);
      }
    }

    // Initialize auth service (admin is created via UI setup)
    const authService = new AuthService(db);

    // Setup rate limiter with settings
    const rateLimitWindow = await settingsService.getNumber('rate_limit_window', 60000);
    const rateLimitMax = await settingsService.getNumber('rate_limit_max', 100);
    rateLimitMiddleware = new (require('./middleware/rateLimiter').default)(rateLimitWindow, rateLimitMax);

    // Apply rate limiter
    app.use('/api/', rateLimitMiddleware.middleware);

    // Get database type for logging
    const stats = await db.getStats();
    const dbType = stats.dbType;

    // Check for HTTPS certificates
    const certPath = process.env.SSL_CERT || path.join(process.cwd(), 'certs', 'cert.pem');
    const keyPath = process.env.SSL_KEY || path.join(process.cwd(), 'certs', 'key.pem');

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      const httpsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      };

      const server = https.createServer(httpsOptions, app);
      server.listen(Number(PORT), HOST, async () => {
        console.log('');
        console.log('  🔗 QuickShare Server v2.0');
        console.log('  ═════════════════════════');
        console.log(`  🌐 HTTPS: https://${HOST}:${PORT}`);
        console.log(`  📁 Data:  ${path.join(process.cwd(), 'data')}`);
        console.log(`  🔒 SSL:   Enabled`);
        try {
          const stats = await db.getStats();
          console.log(`  🗄️  DB:    ${stats.dbType}`);
        } catch (e) {
          console.log(`  🗄️  DB:    unknown`);
        }
        console.log('');
      });
    } else {
      const server = http.createServer(app);
      server.listen(Number(PORT), HOST, () => {
        console.log('');
        console.log('  🔗 QuickShare Server v2.0');
        console.log('  ═════════════════════════');
        console.log(`  🌐 HTTP:  http://${HOST}:${PORT}`);
        console.log(`  📁 Data:  ${path.join(process.cwd(), 'data')}`);
        console.log(`  🔒 SSL:   Disabled`);
        console.log(`  🗄️  DB:    ${dbType}`);
        console.log('');
        console.log('  💡 Run ./generate-certs.sh for HTTPS support');
        console.log('  💡 Use Docker for production deployment');
        console.log('');
      });
    }

    // Periodic cleanup
    setInterval(async () => {
      try {
        // Cleanup expired shares
        const deleted = await db.cleanupExpired();
        if (deleted > 0) {
          console.log(`🧹 Cleaned up ${deleted} expired shares`);
        }

        // Cleanup old history based on retention settings
        const systemConfig = await settingsService.getSystemConfig();
        if (systemConfig.historyRetentionDays > 0) {
          const { shareService } = await import('./services/ShareService');
          const historyDeleted = await shareService.cleanupOldHistory(systemConfig.historyRetentionDays);
          if (historyDeleted > 0) {
            console.log(`🗑️ Cleaned up ${historyDeleted} shares older than ${systemConfig.historyRetentionDays} days`);
          }
        }
      } catch (e) {
        // ignore
      }
    }, 60 * 60 * 1000);

  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

export default app;
