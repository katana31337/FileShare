# 🧪 Тестирование QuickShare

## Обзор

Проект использует **Jest** для тестирования с покрытием кода не менее 70%.

## Запуск тестов

### Frontend

```bash
# Запустить все тесты
npm test

# Запустить тесты в режиме watch
npm run test:watch

# Запустить тесты с отчётом о покрытии
npm run test:coverage
```

### Backend

```bash
cd server

# Запустить все тесты
npm test

# Запустить тесты в режиме watch
npm run test:watch

# Запустить тесты с отчётом о покрытии
npm run test:coverage
```

## Структура тестов

### Frontend (`src/`)

```
src/
├── services/
│   ├── __tests__/
│   │   └── CryptoService.test.ts    # Тесты шифрования
│   └── CryptoService.ts
├── components/
│   ├── __tests__/
│   │   └── FileUpload.test.tsx      # Тесты компонентов
│   └── FileUpload.tsx
└── setupTests.ts                     # Настройка тестового окружения
```

### Backend (`server/src/`)

```
server/src/
├── services/
│   ├── __tests__/
│   │   ├── PasswordValidator.test.ts
│   │   └── ShortLinkService.test.ts
│   ├── PasswordValidator.ts
│   └── ShortLinkService.ts
└── setupTests.ts
```

## Типы тестов

### 1. Unit тесты

Тестируют отдельные функции и классы в изоляции.

**Пример:**
```typescript
describe('PasswordValidator', () => {
  it('should accept strong password', () => {
    const result = PasswordValidator.validate('MyStr0ng!Pass');
    expect(result.isValid).toBe(true);
  });
});
```

### 2. Integration тесты

Тестируют взаимодействие между модулями.

**Пример:**
```typescript
describe('ShareService', () => {
  it('should create share with E2E encryption', async () => {
    const result = await shareService.createShare({
      type: 'text',
      content: 'secret',
      password: 'password',
      e2eEncrypted: true,
    });
    expect(result.id).toBeDefined();
  });
});
```

### 3. E2E тесты (планируется)

Тестируют полные пользовательские сценарии.

**Пример:**
```typescript
describe('Share creation flow', () => {
  it('should create share and download it', async () => {
    // 1. Создать шар
    const share = await createShare('test content');
    
    // 2. Получить ссылку
    const link = share.fullUrl;
    
    // 3. Скачать шар
    const downloaded = await downloadShare(share.id);
    
    expect(downloaded.data).toBe('test content');
  });
});
```

## Покрытие кода

### Текущее покрытие

- **Frontend**: CryptoService (шифрование)
- **Backend**: PasswordValidator, ShortLinkService

### Целевое покрытие

- **Минимум**: 70% для всех метрик (branches, functions, lines, statements)
- **Критичные модули**: 90%+ (CryptoService, AuthService)

## Тестируемые сценарии

### CryptoService

- ✅ Генерация ключа из пароля
- ✅ Шифрование текста
- ✅ Дешифрование текста
- ✅ Шифрование файлов
- ✅ Дешифрование файлов
- ✅ Обработка ошибок

### PasswordValidator

- ✅ Валидация длины пароля
- ✅ Проверка наличия заглавных букв
- ✅ Проверка наличия строчных букв
- ✅ Проверка наличия цифр
- ✅ Проверка наличия спецсимволов
- ✅ Проверка на распространённые пароли
- ✅ Расчёт силы пароля

### ShortLinkService

- ✅ Генерация уникальных ID
- ✅ Валидация ID
- ✅ Проверка длины ID
- ✅ Проверка допустимых символов

## Mock и Stub

### Web Crypto API

```typescript
// src/setupTests.ts
const cryptoMock = {
  subtle: {
    importKey: jest.fn(),
    deriveKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  getRandomValues: jest.fn(),
};
```

### Database

```typescript
// server/src/setupTests.ts
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
```

## Лучшие практики

### 1. Изоляция тестов

Каждый тест должен быть независимым.

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 2. Осмысленные имена тестов

```typescript
// ❌ Плохо
it('works', () => { ... });

// ✅ Хорошо
it('should reject password without uppercase letter', () => { ... });
```

### 3. Тестирование граничных случаев

```typescript
it('should accept password with exactly 8 characters', () => {
  const result = PasswordValidator.validate('My1!pass');
  expect(result.isValid).toBe(true);
});

it('should reject password with 7 characters', () => {
  const result = PasswordValidator.validate('My1!pas');
  expect(result.isValid).toBe(false);
});
```

### 4. Тестирование ошибок

```typescript
it('should throw error for invalid base64', async () => {
  await expect(
    cryptoService.decryptText('invalid!!!', mockKey)
  ).rejects.toThrow();
});
```

## CI/CD интеграция

Тесты автоматически запускаются при:
- Push в main/master
- Создании Pull Request
- Merge request

### GitHub Actions (пример)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: cd server && npm ci && npm test
```

## Отчёты о покрытии

После запуска `npm run test:coverage` создаётся отчёт в папке `coverage/`:

```
coverage/
├── lcov-report/
│   └── index.html    # HTML отчёт
├── coverage-final.json
└── clover.xml
```

Откройте `coverage/lcov-report/index.html` в браузере для детального просмотра.

## Добавление новых тестов

1. Создайте файл `*.test.ts` рядом с тестируемым модулем
2. Импортируйте модуль
3. Напишите тесты
4. Запустите `npm test` для проверки
5. Проверьте покрытие: `npm run test:coverage`

## Полезные команды

```bash
# Запустить только один файл тестов
npm test -- CryptoService.test.ts

# Запустить тесты с определённым именем
npm test -- -t "should accept strong password"

# Запустить тесты без кэша
npm test -- --no-cache

# Запустить тесты в verbose режиме
npm test -- --verbose
```

## Troubleshooting

### Проблема: "Cannot find module"

**Решение:** Проверьте пути импорта в `jest.config.ts`

### Проблема: "Web Crypto API is not defined"

**Решение:** Убедитесь, что `setupTests.ts` правильно настроен

### Проблема: Тесты падают случайно

**Решение:** Добавьте `jest.clearAllMocks()` в `beforeEach`

## Ресурсы

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [TypeScript Testing](https://www.typescriptlang.org/docs/handbook/testing.html)
