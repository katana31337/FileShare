import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { shareService } from '../services/ShareService';
import { fileService } from '../services/FileService';
import { shortLinkService } from '../services/ShortLinkService';
import { SettingsService } from '../services/SettingsService';
import { database } from '../db/database';

const router = Router();
const settingsService = new SettingsService(database);

// Configure multer with high limit (real limit checked dynamically from DB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB - nginx-level protection
  },
});

// Middleware to check file size against DB settings
const checkFileSizeLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.file) {
      const maxFileSize = await settingsService.getNumber('max_file_size', 100 * 1024 * 1024);
      
      if (req.file.size > maxFileSize) {
        // Delete the file from memory
        req.file = undefined as any;
        const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
        return res.status(413).json({ 
          error: 'FILE_TOO_LARGE', 
          message: `Файл слишком большой. Максимальный размер: ${maxSizeMB} МБ` 
        });
      }
    }
    next();
  } catch (error: any) {
    next(error);
  }
};

/**
 * POST /api/shares - Create a text share
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, content, expiresIn, maxDownloads, password, e2eEncrypted } = req.body;

    if (type === 'text' && !content?.trim()) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Content is required for text shares' });
    }

    if (typeof maxDownloads === 'number' && (maxDownloads < 1 || maxDownloads > 1000)) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Max downloads must be between 1 and 1000' });
    }

    // Get base URL from request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'] || 'localhost';
    const baseUrl = `${protocol}://${host}`;

    const result = await shareService.createShare({
      type: type || 'text',
      content,
      expiresIn,
      maxDownloads: maxDownloads || undefined,
      password: password || undefined,
      e2eEncrypted: e2eEncrypted || false,
    }, baseUrl);

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * POST /api/shares/upload - Upload a file share
 */
router.post('/upload', upload.single('file'), checkFileSizeLimit, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'VALIDATION', message: 'No file provided' });
    }

    const id = shortLinkService.generate();

    // Save file to disk
    const filePath = await fileService.saveFile(
      req.file.buffer,
      req.file.originalname,
      id
    );

    const expiresIn = req.body.expiresIn ? parseInt(req.body.expiresIn) : undefined;
    const maxDownloads = req.body.maxDownloads ? parseInt(req.body.maxDownloads) : undefined;
    const password = req.body.password || undefined;

    // Get base URL from request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'] || 'localhost';
    const baseUrl = `${protocol}://${host}`;

    const result = await shareService.createShare({
      type: 'file',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      filePath,
      expiresIn,
      maxDownloads,
      password,
    }, baseUrl);

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * GET /api/shares/:id - Get share info
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!shortLinkService.isValid(id)) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Invalid share ID' });
    }

    const info = await shareService.getShareInfo(id);
    res.json(info);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('expired')) {
      return res.status(404).json({ error: 'NOT_FOUND', message: error.message });
    }
    if (error.message.includes('limit')) {
      return res.status(410).json({ error: 'GONE', message: error.message });
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * GET /api/shares/:id/download - Download share content
 */
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.query;

    if (!shortLinkService.isValid(id)) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Invalid share ID' });
    }

    const result = await shareService.downloadShare(id, password as string | undefined);
    res.json(result);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('expired')) {
      return res.status(404).json({ error: 'NOT_FOUND', message: error.message });
    }
    if (error.message.includes('Password') || error.message.includes('password')) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: error.message });
    }
    if (error.message.includes('limit')) {
      return res.status(410).json({ error: 'GONE', message: error.message });
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

export default router;
