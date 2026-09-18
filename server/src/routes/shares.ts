import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { shareService } from '../services/ShareService';
import { fileService } from '../services/FileService';
import { shortLinkService } from '../services/ShortLinkService';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: fileService.getMaxFileSize(),
  },
});

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

    const result = await shareService.createShare({
      type: type || 'text',
      content,
      expiresIn,
      maxDownloads: maxDownloads || undefined,
      password: password || undefined,
      e2eEncrypted: e2eEncrypted || false,
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

/**
 * POST /api/shares/upload - Upload a file share
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
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

    const result = await shareService.createShare({
      type: 'file',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      filePath,
      expiresIn,
      maxDownloads,
      password,
    });

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
