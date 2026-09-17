# 🔗 QuickShare — Анонимный обмен файлами и текстом

Клиент-серверное приложение для анонимного обмена файлами и текстом через короткие ссылки.

## 🏗️ Архитектура (SOLID)

### Принципы SOLID в проекте:

| Принцип | Реализация |
|---------|-----------|
| **S** - Single Responsibility | Каждый сервис отвечает за одну задачу: `DatabaseService`, `FileService`, `ShortLinkService`, `ShareService` |
| **O** - Open/Closed | Сервисы расширяются через интерфейсы, не модифицируя существующий код |
| **L** - Liskov Substitution | `ShareService` работает с абстракциями, может использовать любой бэкенд (API/localStorage) |
| **I** - Interface Segregation | Тонкие интерфейсы: `ShareServiceInterface` определяет только нужные методы |
| **D** - Dependency Inversion | Frontend зависит от абстракции `shareService`, а не от конкретной реализации |

### Структура проекта:

```
├── src/                          # Frontend (React + Vite + Tailwind)
│   ├── components/               # UI компоненты
│   │   ├── FileUpload.tsx        # Drag & drop загрузка файлов
│   │   ├── TextShare.tsx         # Ввод и отправка текста
│   │   ├── ShareOptions.tsx      # Настройки (срок, лимит, пароль)
│   │   ├── ShareLink.tsx         # Отображение результата + QR
│   │   └── DownloadPage.tsx      # Страница скачивания
│   ├── services/                 # Бизнес-логика
│   │   ├── api.ts                # HTTP клиент для backend
│   │   ├── storage.ts            # localStorage fallback
│   │   └── shareService.ts       # Оркестратор (API → localStorage)
│   ├── types/                    # TypeScript типы
│   │   └── index.ts
│   ├── App.tsx                   # Главный компонент
│   └── index.css                 # Стили
│
├── server/                       # Backend (Express + SQLite)
│   ├── src/
│   │   ├── db/
│   │   │   └── database.ts       # DatabaseService (SQLite)
│   │   ├── routes/
│   │   │   └── shares.ts         # API маршруты
│   │   ├── services/
│   │   │   ├── ShareService.ts   # Оркестрация шаринга
│   │   │   ├── FileService.ts    # Работа с файлами
│   │   │   └── ShortLinkService.ts # Генерация ID
│   │   └── index.ts              # Точка входа сервера
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

## 🚀 Быстрый старт

### Frontend (Development):
```bash
npm install
npm run dev
```

### Backend:
```bash
cd server
npm install
npm run dev
```

### Production:
```bash
# Build frontend
npm run build

# Build & start backend
cd server
npm install
npm run build
npm start
```

## 🔐 HTTPS

Для включения HTTPS поместите сертификаты в `server/certs/`:
- `cert.pem` — SSL сертификат
- `key.pem` — Приватный ключ

Или используйте переменные окружения:
```bash
SSL_CERT=/path/to/cert.pem SSL_KEY=/path/to/key.pem npm start
```

### Генерация self-signed сертификата:
```bash
mkdir -p server/certs
openssl req -x509 -newkey rsa:4096 -keyout server/certs/key.pem -out server/certs/cert.pem -days 365 -nodes
```

## 📡 API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/health` | Проверка здоровья сервера |
| POST | `/api/shares` | Создать текстовый шар |
| POST | `/api/shares/upload` | Загрузить файл |
| GET | `/api/shares/:id` | Получить информацию о шаре |
| GET | `/api/shares/:id/download` | Скачать содержимое |

## 🛡️ Безопасность

- **Анонимность**: Нет регистрации, нет отслеживания
- **Пароли**: Хеширование PBKDF2 с солью
- **HTTPS**: Поддержка TLS из коробки
- **Автоудаление**: Истекшие шары удаляются автоматически
- **Лимиты**: Ограничение размера файлов (100 МБ), количества скачиваний
- **Helmet**: Защита от распространённых веб-уязвимостей

## ⚙️ Конфигурация

### Переменные окружения:
```env
PORT=3001                    # Порт сервера
HOST=0.0.0.0                # Хост
CORS_ORIGIN=*               # Разрешённые домены
SSL_CERT=./certs/cert.pem   # Путь к сертификату
SSL_KEY=./certs/key.pem     # Путь к ключу
NODE_ENV=production          # Режим работы
```

## 🔧 Расширение функционала

Проект спроектирован для лёгкого расширения:

1. **Новый тип контента**: Добавьте в `ShareType` и создайте компонент
2. **Новое хранилище**: Реализуйте интерфейс и добавьте в `shareService`
3. **Новый API endpoint**: Создайте роутер в `server/src/routes/`
4. **Новый middleware**: Добавьте в `server/src/index.ts`

## 📝 Лицензия

MIT
