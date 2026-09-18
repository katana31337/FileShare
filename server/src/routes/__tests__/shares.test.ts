import request from 'supertest';
import express from 'express';
import sharesRouter from '../shares';
import { database } from '../../db/database';

// Mock database module
jest.mock('../../db/database', () => ({
  database: {
    createShare: jest.fn(),
    findShareById: jest.fn(),
    incrementShareDownloads: jest.fn(),
  },
}));

describe('Shares API Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/shares', sharesRouter);
  });

  describe('POST /api/shares', () => {
    it('должен создавать текстовый шар', async () => {
      const mockShare = {
        id: 'test-id',
        type: 'text' as const,
        content: 'test content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: null,
        max_downloads: null,
        downloads: 0,
        created_at: new Date().toISOString(),
        expires_at: null,
        e2e_encrypted: false,
      };

      (database.createShare as jest.Mock).mockResolvedValue(mockShare);

      const response = await request(app)
        .post('/api/shares')
        .send({
          type: 'text',
          content: 'test content',
        });

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
    });

    it('должен возвращать 400 если контент пустой', async () => {
      const response = await request(app)
        .post('/api/shares')
        .send({
          type: 'text',
          content: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION');
    });

    it('должен возвращать 400 если maxDownloads невалидный', async () => {
      const response = await request(app)
        .post('/api/shares')
        .send({
          type: 'text',
          content: 'test content',
          maxDownloads: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION');
    });
  });

  describe('GET /api/shares/:id', () => {
    it('должен возвращать информацию о шаре', async () => {
      const mockShare = {
        id: 'testid123',
        type: 'text' as const,
        content: 'test content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: null,
        max_downloads: null,
        downloads: 0,
        created_at: new Date().toISOString(),
        expires_at: null,
        e2e_encrypted: false,
      };

      (database.findShareById as jest.Mock).mockResolvedValue(mockShare);

      const response = await request(app).get('/api/shares/testid123');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('должен возвращать 404 если шар не найден', async () => {
      (database.findShareById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/shares/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/shares/:id/download', () => {
    it('должен скачивать текстовый шар', async () => {
      const mockShare = {
        id: 'testid123',
        type: 'text' as const,
        content: 'test content',
        file_name: null,
        file_size: null,
        mime_type: null,
        file_path: null,
        password_hash: null,
        max_downloads: null,
        downloads: 0,
        created_at: new Date().toISOString(),
        expires_at: null,
        e2e_encrypted: false,
      };

      (database.findShareById as jest.Mock).mockResolvedValue(mockShare);
      (database.incrementShareDownloads as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).get('/api/shares/testid123/download');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('должен возвращать 404 если шар не найден', async () => {
      (database.findShareById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/shares/nonexistent/download');

      expect(response.status).toBe(404);
    });
  });
});
