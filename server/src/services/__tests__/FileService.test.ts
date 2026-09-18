import { FileService } from '../FileService';
import fs from 'fs';
import path from 'path';

describe('FileService', () => {
  let fileService: FileService;
  const testUploadDir = '/tmp/quickshare-test-uploads';

  beforeEach(() => {
    fileService = new FileService(testUploadDir);
    
    // Создаём тестовую директорию
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Очищаем тестовую директорию
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  describe('Валидация имён файлов', () => {
    it('должен принимать валидные имена файлов', () => {
      const validNames = [
        'document.pdf',
        'image.png',
        'my-file.txt',
        'файл_документ.docx',
        'file123.zip',
        'README.md',
      ];

      validNames.forEach(name => {
        expect(() => fileService.validateFileName(name)).not.toThrow();
      });
    });

    it('должен отклонять имена с опасными символами', () => {
      const invalidNames = [
        '../../../etc/passwd',
        'file\x00.txt',
        'file<name>.txt',
        'file>name.txt',
        'file:name.txt',
        'file"name.txt',
        'file|name.txt',
        'file?name.txt',
        'file*name.txt',
      ];

      invalidNames.forEach(name => {
        expect(() => fileService.validateFileName(name)).toThrow();
      });
    });

    it('должен отклонять слишком длинные имена', () => {
      const longName = 'a'.repeat(256) + '.txt';
      expect(() => fileService.validateFileName(longName)).toThrow();
    });

    it('должен отклонять пустые имена', () => {
      expect(() => fileService.validateFileName('')).toThrow();
      expect(() => fileService.validateFileName('   ')).toThrow();
    });

    it('должен отклонять имена с путями', () => {
      expect(() => fileService.validateFileName('/etc/passwd')).toThrow();
      expect(() => fileService.validateFileName('..\\file.txt')).toThrow();
      expect(() => fileService.validateFileName('./file.txt')).toThrow();
    });
  });

  describe('Валидация размера файлов', () => {
    it('должен принимать файлы в пределах лимита', () => {
      const maxSize = 100 * 1024 * 1024; // 100MB
      const validSizes = [
        0,
        1024,
        1024 * 1024,
        50 * 1024 * 1024,
        maxSize,
      ];

      validSizes.forEach(size => {
        expect(() => fileService.validateFileSize(size, maxSize)).not.toThrow();
      });
    });

    it('должен отклонять файлы превышающие лимит', () => {
      const maxSize = 100 * 1024 * 1024;
      const invalidSizes = [
        maxSize + 1,
        200 * 1024 * 1024,
        1024 * 1024 * 1024,
      ];

      invalidSizes.forEach(size => {
        expect(() => fileService.validateFileSize(size, maxSize)).toThrow();
      });
    });

    it('должен выбрасывать понятное сообщение об ошибке', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const fileSize = 20 * 1024 * 1024; // 20MB

      expect(() => fileService.validateFileSize(fileSize, maxSize)).toThrow(/10 МБ/);
    });
  });

  describe('Валидация MIME типов', () => {
    it('должен принимать разрешённые MIME типы', () => {
      const validTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'application/zip',
      ];

      validTypes.forEach(type => {
        expect(() => fileService.validateMimeType(type)).not.toThrow();
      });
    });

    it('должен отклонять опасные MIME типы', () => {
      const invalidTypes = [
        'application/x-executable',
        'application/x-sharedlib',
        'application/x-msdownload',
      ];

      invalidTypes.forEach(type => {
        expect(() => fileService.validateMimeType(type)).toThrow();
      });
    });
  });

  describe('Сохранение файлов', () => {
    it('должен сохранять файл с уникальным именем', async () => {
      const buffer = Buffer.from('test content');
      const originalName = 'test.txt';
      const id = 'abc123';

      const savedPath = await fileService.saveFile(buffer, originalName, id);

      expect(fs.existsSync(savedPath)).toBe(true);
      expect(path.dirname(savedPath)).toBe(testUploadDir);
    });

    it('должен сохранять содержимое файла корректно', async () => {
      const content = 'test content 123';
      const buffer = Buffer.from(content);
      const originalName = 'test.txt';
      const id = 'abc123';

      const savedPath = await fileService.saveFile(buffer, originalName, id);
      const savedContent = fs.readFileSync(savedPath, 'utf-8');

      expect(savedContent).toBe(content);
    });

    it('должен создавать директорию, если она не существует', async () => {
      const newDir = '/tmp/quickshare-new-dir';
      const newFileService = new FileService(newDir);
      
      const buffer = Buffer.from('test');
      const savedPath = await newFileService.saveFile(buffer, 'test.txt', 'id1');

      expect(fs.existsSync(savedPath)).toBe(true);

      // Cleanup
      fs.rmSync(newDir, { recursive: true, force: true });
    });
  });

  describe('Удаление файлов', () => {
    it('должен удалять существующий файл', async () => {
      const buffer = Buffer.from('test');
      const savedPath = await fileService.saveFile(buffer, 'test.txt', 'id1');

      expect(fs.existsSync(savedPath)).toBe(true);

      await fileService.deleteFile(savedPath);

      expect(fs.existsSync(savedPath)).toBe(false);
    });

    it('не должен выбрасывать ошибку при удалении несуществующего файла', async () => {
      const nonExistentPath = path.join(testUploadDir, 'nonexistent.txt');

      await expect(fileService.deleteFile(nonExistentPath)).resolves.not.toThrow();
    });
  });

  describe('Получение информации о файле', () => {
    it('должен возвращать корректный размер файла', async () => {
      const content = 'test content';
      const buffer = Buffer.from(content);
      const savedPath = await fileService.saveFile(buffer, 'test.txt', 'id1');

      const size = fileService.getFileSize(savedPath);

      expect(size).toBe(buffer.length);
    });

    it('должен возвращать 0 для несуществующего файла', () => {
      const nonExistentPath = path.join(testUploadDir, 'nonexistent.txt');
      const size = fileService.getFileSize(nonExistentPath);

      expect(size).toBe(0);
    });
  });

  describe('Безопасность', () => {
    it('должен предотвращать path traversal атаки', () => {
      const maliciousNames = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\SAM',
      ];

      maliciousNames.forEach(name => {
        expect(() => fileService.validateFileName(name)).toThrow();
      });
    });

    it('должен предотвращать null byte injection', () => {
      const maliciousName = 'file\x00.txt';
      expect(() => fileService.validateFileName(maliciousName)).toThrow();
    });

    it('должен ограничивать размер имени файла', () => {
      const longName = 'a'.repeat(300) + '.txt';
      expect(() => fileService.validateFileName(longName)).toThrow();
    });
  });
});
