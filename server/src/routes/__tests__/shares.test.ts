import request from 'supertest';
import express from 'express';
import sharesRouter from '../routes/shares';
import { IDatabaseAdapter } from '../../db/adapters/IDatabaseAdapter';

describe('Shares API Endpoints', () => {
  let app: express.Application;
  let mockDb: jest.Mocked<IDatabaseAdapter>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/shares', sharesRouter);

    mockDb = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isHealthy: jest.fn(),
      createShare: jest.fn(),
      findShareById: jest.fn(),
      incrementShareDownloads: jest.fn(),
      deleteShare: jest.fn(),
      listShares: jest.fn(),
      cleanupExpired: jest.fn(),
      getSetting: jest.fn(),
      setSetting: jest.fn(),
      getAllSettings: jest.fn(),
      getSettingsByCategory: jest.fn(),
      deleteSetting: jest.fn(),
      createAdmin: jest.fn(),
      findAdminByUsername: jest.fn(),
      findAdminById: jest.fn(),
      updateAdminLastLogin: jest.fn(),
      changeAdminPassword: jest.fn(),
      getStats: jest.fn(),
    };
  });

  describe('POST /api/shares', () => {
    it('должен создавать текстовый шар', async () => {
      const mockShare = {
        id: 'test-id',
        type: 'text',
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
      };

      mockDb.createShare.mockResolvedValue(mockShare);

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
        id: 'test-id',
        type: 'text',
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
      };

      mockDb.findShareById.mockResolvedValue(mockShare);

      const response = await request(app).get('/api/shares/test-id');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('должен возвращать 404 если шар не найден', async () => {
      mockDb.findShareById.mockResolvedValue(null);

      const response = await request(app).get('/api/shares/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/shares/:id/download', () => {
    it('должен скачивать текстовый шар', async () => {
      const mockShare = {
        id: 'test-id',
        type: 'text',
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
      };

      mockDb.findShareById.mockResolvedValue(mockShare);
      mockDb.incrementShareDownloads.mockResolvedValue(undefined);

      const response = await request(app).get('/api/shares/test-id/download');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('должен возвращать 404 если шар не найден', async () => {
      mockDb.findShareById.mockResolvedValue(null);

      const response = await request(app).get('/api/shares/nonexistent/download');

      expect(response.status).toBe(404);
    });
  });
});
