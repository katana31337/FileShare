import { AuthService } from '../AuthService';
import { IDatabaseAdapter, AdminUser } from '../../db/adapters/IDatabaseAdapter';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: jest.Mocked<IDatabaseAdapter>;

  beforeEach(() => {
    // Создаём мок базы данных
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

    authService = new AuthService(mockDb, 'test-secret-key', 3600);
  });

  describe('hashPassword', () => {
    it('должен хешировать пароль с солью', () => {
      const password = 'test-password';
      const hash = authService.hashPassword(password);

      expect(hash).toContain(':');
      expect(hash.split(':')).toHaveLength(2);
    });

    it('должен генерировать разные хеши для одинаковых паролей', () => {
      const password = 'test-password';
      const hash1 = authService.hashPassword(password);
      const hash2 = authService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('должен успешно проверять правильный пароль', () => {
      const password = 'test-password';
      const hash = authService.hashPassword(password);

      const isValid = authService.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('должен отклонять неправильный пароль', () => {
      const password = 'test-password';
      const hash = authService.hashPassword(password);

      const isValid = authService.verifyPassword('wrong-password', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('должен генерировать валидный JWT токен', () => {
      const admin: AdminUser = {
        id: 'test-id',
        username: 'testuser',
        password_hash: 'hash',
        created_at: new Date().toISOString(),
        last_login: null,
      };

      const token = authService.generateToken(admin);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });
  });

  describe('verifyToken', () => {
    it('должен успешно проверять валидный токен', () => {
      const admin: AdminUser = {
        id: 'test-id',
        username: 'testuser',
        password_hash: 'hash',
        created_at: new Date().toISOString(),
        last_login: null,
      };

      const token = authService.generateToken(admin);
      const payload = authService.verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload?.adminId).toBe('test-id');
      expect(payload?.username).toBe('testuser');
    });

    it('должен отклонять невалидный токен', () => {
      const payload = authService.verifyToken('invalid.token.here');

      expect(payload).toBeNull();
    });

    it('должен отклонять истёкший токен', () => {
      // Создаём AuthService с истёкшим временем
      const expiredAuthService = new AuthService(mockDb, 'test-secret', -3600);
      
      const admin: AdminUser = {
        id: 'test-id',
        username: 'testuser',
        password_hash: 'hash',
        created_at: new Date().toISOString(),
        last_login: null,
      };

      const token = expiredAuthService.generateToken(admin);
      const payload = expiredAuthService.verifyToken(token);

      expect(payload).toBeNull();
    });
  });

  describe('login', () => {
    it('должен успешно авторизовывать с правильными данными', async () => {
      const password = 'test-password';
      const hash = authService.hashPassword(password);

      const admin: AdminUser = {
        id: 'test-id',
        username: 'testuser',
        password_hash: hash,
        created_at: new Date().toISOString(),
        last_login: null,
      };

      mockDb.findAdminByUsername.mockResolvedValue(admin);
      mockDb.updateAdminLastLogin.mockResolvedValue(undefined);

      const result = await authService.login('testuser', password);

      expect(result).toBeDefined();
      expect(result?.token).toBeDefined();
      expect(result?.admin.username).toBe('testuser');
      expect(mockDb.updateAdminLastLogin).toHaveBeenCalledWith('test-id');
    });

    it('должен отклонять неправильный пароль', async () => {
      const admin: AdminUser = {
        id: 'test-id',
        username: 'testuser',
        password_hash: authService.hashPassword('correct-password'),
        created_at: new Date().toISOString(),
        last_login: null,
      };

      mockDb.findAdminByUsername.mockResolvedValue(admin);

      const result = await authService.login('testuser', 'wrong-password');

      expect(result).toBeNull();
    });

    it('должен отклонять несуществующего пользователя', async () => {
      mockDb.findAdminByUsername.mockResolvedValue(null);

      const result = await authService.login('nonexistent', 'password');

      expect(result).toBeNull();
    });
  });

  describe('createAdmin', () => {
    it('должен создавать нового администратора', async () => {
      mockDb.findAdminByUsername.mockResolvedValue(null);
      mockDb.createAdmin.mockResolvedValue({
        id: 'new-id',
        username: 'newadmin',
        password_hash: 'hash',
        created_at: new Date().toISOString(),
        last_login: null,
      });

      const admin = await authService.createAdmin('newadmin', 'password123');

      expect(admin).toBeDefined();
      expect(admin.username).toBe('newadmin');
      expect(mockDb.createAdmin).toHaveBeenCalled();
    });

    it('должен выбрасывать ошибку если администратор уже существует', async () => {
      const existingAdmin: AdminUser = {
        id: 'existing-id',
        username: 'existing',
        password_hash: 'hash',
        created_at: new Date().toISOString(),
        last_login: null,
      };

      mockDb.findAdminByUsername.mockResolvedValue(existingAdmin);

      await expect(authService.createAdmin('existing', 'password')).rejects.toThrow('already exists');
    });
  });

  describe('changePassword', () => {
    it('должен успешно менять пароль', async () => {
      const oldPassword = 'old-password';
      const hash = authService.hashPassword(oldPassword);

      const admin: AdminUser = {
        id: 'test-id',
        username: 'testuser',
        password_hash: hash,
        created_at: new Date().toISOString(),
        last_login: null,
      };

      mockDb.findAdminById.mockResolvedValue(admin);
      mockDb.changeAdminPassword.mockResolvedValue(undefined);

      const success = await authService.changePassword('test-id', oldPassword, 'new-password');

      expect(success).toBe(true);
      expect(mockDb.changeAdminPassword).toHaveBeenCalled();
    });

    it('должен отклонять неправильный старый пароль', async () => {
      const admin: AdminUser = {
        id: 'test-id',
        username: 'testuser',
        password_hash: authService.hashPassword('correct-old-password'),
        created_at: new Date().toISOString(),
        last_login: null,
      };

      mockDb.findAdminById.mockResolvedValue(admin);

      const success = await authService.changePassword('test-id', 'wrong-old-password', 'new-password');

      expect(success).toBe(false);
    });
  });
});
