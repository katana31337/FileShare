import { Router, Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/SettingsService';
import { AuthService } from '../services/AuthService';
import { shareService } from '../services/ShareService';
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
 * GET /api/admin/public-config — Public site configuration (for frontend)
 */
router.get('/public-config', async (_req: Request, res: Response) => {
  try {
    const siteConfig = await settingsService.getSiteConfig();
    const limits = await settingsService.getLimits();
    const security = await settingsService.getSecurityConfig();

    res.json({
      ...siteConfig,
      limits,
      security,
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
 * PUT /api/admin/password — Change admin password
 */
router.put('/password', async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const adminId = (req as any).adminId;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Old and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Password must be at least 6 characters' });
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
