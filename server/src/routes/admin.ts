import { Router, Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/SettingsService';
import { AuthService } from '../services/AuthService';
import { PasswordValidator } from '../services/PasswordValidator';
import { database } from '../db/database';

const router = Router();

// Middleware to check auth
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token required' });
    return;
  }

  const token = authHeader.slice(7);
  const authService = new AuthService(database);
  const payload = authService.verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    return;
  }

  (req as any).adminId = payload.adminId;
  (req as any).adminUsername = payload.username;
  next();
};

// Public routes
const settingsService = new SettingsService(database);

/**
 * GET /api/public/config — Public site configuration (for frontend)
 * Returns only non-sensitive settings needed for UI
 */
router.get('/public/config', async (_req: Request, res: Response) => {
  try {
    const siteConfig = await settingsService.getSiteConfig();
    const limits = await settingsService.getLimits();

    // Return only public-safe settings
    res.json({
      ...siteConfig,
      limits,
      // Don't expose: adminPanelPath, security settings, internal configs
    });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * GET /api/admin/status — Check if admin setup is needed
 * Returns whether admin exists (does NOT expose adminPanelPath)
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    // Check if any admin exists by trying to find one
    let adminExists = false;
    try {
      const db = database as any;
      if (db.db && db.db.prepare) {
        // SQLite
        const result = db.db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
        adminExists = result.count > 0;
      } else if (db.pool) {
        // PostgreSQL
        const result = await db.pool.query('SELECT COUNT(*) as count FROM admin_users');
        adminExists = parseInt(result.rows[0].count) > 0;
      } else if (db.connection) {
        // MySQL
        const [rows] = await db.connection.query('SELECT COUNT(*) as count FROM admin_users');
        adminExists = (rows as any[])[0].count > 0;
      } else if (db.db && db.db.collection) {
        // MongoDB
        const count = await db.db.collection('admin_users').countDocuments();
        adminExists = count > 0;
      }
    } catch (e) {
      // If we can't check, assume admin exists
      adminExists = true;
    }

    res.json({
      adminExists,
      setupRequired: !adminExists,
      // Don't expose adminPanelPath here!
    });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * GET /api/admin/check-path — Check if path matches admin panel path (public)
 * Returns true/false without exposing the actual adminPanelPath
 */
router.get('/check-path', async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      return res.json({ matches: false });
    }

    const adminPanelPath = await settingsService.getOrDefault('admin_panel_path', 'admin');
    const matches = path === adminPanelPath;

    res.json({ matches });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * POST /api/admin/setup — Create first admin (only if no admins exist)
 */
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const { username, password, adminPanelPath } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Username and password required' });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Username must be 3-50 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Username can only contain letters, numbers, and underscores' });
    }

    // Validate password strength
    const passwordValidation = PasswordValidator.validate(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'WEAK_PASSWORD',
        message: 'Password does not meet requirements',
        feedback: passwordValidation.feedback,
        score: passwordValidation.score,
      });
    }

    // Check if admin already exists
    let adminExists = false;
    try {
      const db = database as any;
      if (db.db && db.db.prepare) {
        const result = db.db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
        adminExists = result.count > 0;
      } else if (db.pool) {
        const result = await db.pool.query('SELECT COUNT(*) as count FROM admin_users');
        adminExists = parseInt(result.rows[0].count) > 0;
      } else if (db.connection) {
        const [rows] = await db.connection.query('SELECT COUNT(*) as count FROM admin_users');
        adminExists = (rows as any[])[0].count > 0;
      } else if (db.db && db.db.collection) {
        const count = await db.db.collection('admin_users').countDocuments();
        adminExists = count > 0;
      }
    } catch (e) {
      adminExists = true;
    }

    if (adminExists) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin already exists. Use login instead.' });
    }

    // Create admin
    const authService = new AuthService(database);
    const admin = await authService.createAdmin(username, password);

    // Update admin panel path if provided
    if (adminPanelPath) {
      if (!/^[a-zA-Z0-9_-]+$/.test(adminPanelPath)) {
        return res.status(400).json({ error: 'VALIDATION', message: 'Admin panel path can only contain letters, numbers, hyphens, and underscores' });
      }
      await settingsService.set('admin_panel_path', adminPanelPath, 'admin', 'URL путь к админ-панели');
    }

    // Generate token
    const token = authService.generateToken(admin);

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
      },
      adminPanelPath: adminPanelPath || 'admin',
    });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return res.status(403).json({ error: 'FORBIDDEN', message: error.message });
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * POST /api/admin/validate-password — Validate password strength (public)
 */
router.post('/validate-password', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Password required' });
    }

    const validation = PasswordValidator.validate(password);
    const strength = PasswordValidator.getStrengthLabel(validation.score);

    res.json({
      ...validation,
      strength,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * POST /api/admin/login — Admin login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Username and password required' });
    }

    const authService = new AuthService(database);
    const result = await authService.login(username, password);

    if (!result) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }

    res.json({
      token: result.token,
      admin: {
        id: result.admin.id,
        username: result.admin.username,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

// Protected routes
router.use(requireAuth);

/**
 * GET /api/admin/config — Admin-only configuration (requires auth)
 * Returns all settings including sensitive ones
 */
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const siteConfig = await settingsService.getSiteConfig();
    const limits = await settingsService.getLimits();
    const security = await settingsService.getSecurityConfig();
    const systemConfig = await settingsService.getSystemConfig();
    const adminPanelPath = await settingsService.getOrDefault('admin_panel_path', 'admin');

    res.json({
      ...siteConfig,
      limits,
      security,
      system: systemConfig,
      adminPanelPath,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * GET /api/admin/settings — Get all settings
 */
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await settingsService.getAll();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * GET /api/admin/settings/:category — Get settings by category
 */
router.get('/settings/:category', async (req: Request, res: Response) => {
  try {
    const settings = await settingsService.getByCategory(req.params.category);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * PUT /api/admin/settings — Update multiple settings
 */
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Settings must be an array' });
    }

    await settingsService.setMany(settings);
    res.json({ success: true, message: 'Settings updated' });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * PUT /api/admin/settings/:key — Update single setting
 */
router.put('/settings/:key', async (req: Request, res: Response) => {
  try {
    const { value, category, description } = req.body;
    await settingsService.set(req.params.key, value, category, description);
    res.json({ success: true, message: 'Setting updated' });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * GET /api/admin/stats — Get statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await database.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * GET /api/admin/shares — List all shares
 */
router.get('/shares', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string | undefined;

    const shares = await database.listShares({ limit, offset, type });
    res.json(shares);
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * DELETE /api/admin/shares/:id — Delete a share
 */
router.delete('/shares/:id', async (req: Request, res: Response) => {
  try {
    await database.deleteShare(req.params.id);
    res.json({ success: true, message: 'Share deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * POST /api/admin/cleanup — Cleanup expired shares
 */
router.post('/cleanup', async (_req: Request, res: Response) => {
  try {
    const deleted = await database.cleanupExpired();
    res.json({ success: true, deleted });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * POST /api/admin/cleanup-history — Cleanup old history based on retention settings
 */
router.post('/cleanup-history', async (_req: Request, res: Response) => {
  try {
    const { shareService } = await import('../services/ShareService');
    const systemConfig = await settingsService.getSystemConfig();
    const deleted = await shareService.cleanupOldHistory(systemConfig.historyRetentionDays);
    res.json({ 
      success: true, 
      deleted,
      retentionDays: systemConfig.historyRetentionDays,
      message: systemConfig.historyRetentionDays === 0 
        ? 'History retention is disabled (unlimited storage)' 
        : `Cleaned up ${deleted} shares older than ${systemConfig.historyRetentionDays} days`
    });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * PUT /api/admin/password — Change admin password
 */
router.put('/password', async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const adminId = (req as any).adminId;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Old and new password required' });
    }

    // Validate new password strength
    const passwordValidation = PasswordValidator.validate(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'WEAK_PASSWORD',
        message: 'Password does not meet requirements',
        feedback: passwordValidation.feedback,
        score: passwordValidation.score,
      });
    }

    const authService = new AuthService(database);
    const success = await authService.changePassword(adminId, oldPassword, newPassword);

    if (!success) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Invalid old password' });
    }

    res.json({ success: true, message: 'Password changed' });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * GET /api/admin/me — Get current admin info
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId;
    const admin = await database.findAdminById(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Admin not found' });
    }
    res.json({
      id: admin.id,
      username: admin.username,
      lastLogin: admin.last_login,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

export default router;
