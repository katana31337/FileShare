# 🔗 QuickShare v2.0 — Анонимный обмен файлами и текстом

Клиент-серверное приложение для анонимного обмена файлами и текстом через короткие ссылки. Поддерживает любые базы данных, Docker-развёртывание, HTTPS, админ-панель.

## 🏗️ Архитектура (SOLID)

| Принцип | Реализация |
|---------|-----------|
| **S** - Single Responsibility | Каждый сервис/адаптер отвечает за одну задачу |
| **O** - Open/Closed | Новые БД добавляются через адаптеры без изменения кода |
| **L** - Liskov Substitution | Любой адаптер БД подменяет другой через интерфейс |
| **I** - Interface Segregation | Тонкие интерфейсы: `IDatabaseAdapter`, `ShareServiceInterface` |
| **D** - Dependency Inversion | Зависимости от абстракций (интерфейсов), не от реализаций |

## 📁 Структура проекта

```
├── src/                          # Frontend (React + Vite + Tailwind)
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminPanel.tsx    # Панель управления
│   │   │   └── AdminLogin.tsx    # Авторизация админа
│   │   ├── FileUpload.tsx        # Drag & drop загрузка
│   │   ├── TextShare.tsx         # Ввод текста
│   │   ├── ShareOptions.tsx      # Настройки шаров
│   │   ├── ShareLink.tsx         # Результат + QR
│   │   ├── ShareHistory.tsx      # История ссылок
│   │   └── DownloadPage.tsx      # Страница скачивания
│   ├── services/
│   │   ├── api.ts                # HTTP клиент
│   │   ├── storage.ts            # localStorage fallback
│   │   ├── shareService.ts       # Оркестратор
│   │   └── adminApi.ts           # API для админки
│   └── App.tsx                   # Главный компонент
│
├── server/                       # Backend (Express + Multi-DB)
│   ├── src/
│   │   ├── db/
│   │   │   ├── adapters/
│   │   │   │   ├── IDatabaseAdapter.ts  # Интерфейс (SOLID-D)
│   │   │   │   ├── SqliteAdapter.ts     # SQLite
│   │   │   │   ├── PostgresAdapter.ts   # PostgreSQL
│   │   │   │   ├── MysqlAdapter.ts      # MySQL/MariaDB
│   │   │   │   └── MongoAdapter.ts      # MongoDB
│   │   │   ├── DatabaseFactory.ts       # Фабрика (SOLID-O)
│   │   │   └── database.ts              # Singleton
│   │   ├── services/
│   │   │   ├── ShareService.ts          # Оркестрация шаров
│   │   │   ├── SettingsService.ts       # Настройки из БД
│   │   │   ├── AuthService.ts           # JWT авторизация
│   │   │   ├── FileService.ts           # Работа с файлами
│   │   │   └── ShortLinkService.ts      # Генерация ID
│   │   ├── routes/
│   │   │   ├── shares.ts                # API шаров
│   │   │   └── admin.ts                 # API админки
│   │   ├── middleware/
│   │   │   ├── rateLimiter.ts           # Rate limiting
│   │   │   └── security.ts              # Security headers
│   │   └── index.ts                     # Точка входа
│   └── package.json
│
├── scripts/
│   ├── setup-letsencrypt.sh      # Let's Encrypt SSL
│   └── setup-selfsigned.sh       # Self-signed SSL
│
├── Dockerfile                    # Multi-stage build
├── docker-compose.yml            # SQLite (default)
├── docker-compose.postgres.yml   # PostgreSQL
├── docker-compose.mysql.yml      # MySQL
├── docker-compose.mongo.yml      # MongoDB
├── .env.example                  # Конфигурация
└── README.md
```

## 🚀 Быстрый старт

### Docker (рекомендуется):

```bash
# SQLite (по умолчанию)
docker compose up -d

# PostgreSQL
docker compose -f docker-compose.postgres.yml up -d

# MySQL
docker compose -f docker-compose.mysql.yml up -d

# MongoDB
docker compose -f docker-compose.mongo.yml up -d
```

### Разработка:

```bash
# Frontend
npm install && npm run dev

# Backend (в другом терминале)
cd server && npm install && npm run dev
```

## 🔐 HTTPS / SSL

### Self-signed (для разработки):
```bash
chmod +x scripts/setup-selfsigned.sh
./scripts/setup-selfsigned.sh
```

Интерактивный режим позволит указать:
- Локальный домен (quickshare.local, share.lan, 192.168.1.100)
- Автоматически добавит SAN для поддоменов
- Инструкции по установке сертификата в ОС

Или укажите домен сразу:
```bash
./scripts/setup-selfsigned.sh quickshare.local
```

### Let's Encrypt (для продакшена):
```bash
chmod +x scripts/setup-letsencrypt.sh
./scripts/setup-letsencrypt.sh your-domain.com admin@your-domain.com
```

## ⚙️ Админ-панель

### Первичная настройка

При первом запуске админ-панель требует настройки:

1. **URL админки**: Придумайте уникальный путь (например, `my-secret-panel-xyz`)
2. **Имя пользователя**: Создайте логин администратора
3. **Пароль**: Установите сложный пароль (минимум 8 символов, заглавные/строчные буквы, цифры, спецсимволы)

После настройки доступ по адресу: `http(s)://your-domain/your-custom-path`

### Требования к паролю

- Минимум 8 символов
- Заглавная буква (A-Z)
- Строчная буква (a-z)
- Цифра (0-9)
- Специальный символ (!@#$%^&*)
- Не должен быть распространённым

### Что можно настроить:

| Раздел | Настройки |
|--------|-----------|
| 🎨 Основные | Название, описание, иконка, логотип, цвет темы |
| 📏 Лимиты | Макс. размер файла, длина текста, срок жизни, лимит скачиваний |
| 🔒 Безопасность | Пароли, автоудаление, регистрация |
| 🌐 Сеть | CORS, rate limiting |
| ⚙️ Система | Режим обслуживания, аналитика |
| 📦 Шары | Просмотр и удаление шаров |
| 📊 Статистика | Общая статистика сервиса |
| 🔐 Безопасность | Смена пароля админа |

## 🗄️ Поддержка баз данных

| БД | Статус | Переменная |
|----|--------|-----------|
| SQLite | ✅ По умолчанию | `DB_TYPE=sqlite` |
| PostgreSQL | ✅ | `DB_TYPE=postgres` |
| MySQL | ✅ | `DB_TYPE=mysql` |
| MongoDB | ✅ | `DB_TYPE=mongodb` |

### Добавление новой БД:
1. Создайте класс, реализующий `IDatabaseAdapter`
2. Добавьте его в `DatabaseFactory.create()`
3. Готово!

## 📡 API Endpoints

### Публичные:
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/health` | Проверка здоровья |
| POST | `/api/shares` | Создать текстовый шар |
| POST | `/api/shares/upload` | Загрузить файл |
| GET | `/api/shares/:id` | Информация о шаре |
| GET | `/api/shares/:id/download` | Скачать контент |
| GET | `/api/admin/public-config` | Публичные настройки сайта |

### Админ (требует JWT):
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/admin/login` | Авторизация |
| GET | `/api/admin/settings` | Все настройки |
| PUT | `/api/admin/settings` | Обновить настройки |
| GET | `/api/admin/stats` | Статистика |
| GET | `/api/admin/shares` | Список шаров |
| DELETE | `/api/admin/shares/:id` | Удалить шар |
| POST | `/api/admin/cleanup` | Очистить истёкшие |
| PUT | `/api/admin/password` | Сменить пароль |

## 🐳 Docker Compose варианты

```bash
# SQLite
docker compose up -d

# PostgreSQL
docker compose -f docker-compose.postgres.yml up -d

# MySQL
docker compose -f docker-compose.mysql.yml up -d

# MongoDB
docker compose -f docker-compose.mongo.yml up -d
```

## 🔧 Переменные окружения

```env
# Сервер
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# База данных
DB_TYPE=sqlite          # sqlite | postgres | mysql | mongodb
DB_HOST=localhost       # Для postgres/mysql
DB_PORT=5432
DB_NAME=quickshare
DB_USER=quickshare
DB_PASSWORD=secret
DB_MONGO_URI=mongodb://localhost:27017/quickshare  # Для mongodb

# Админ
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=change-me-in-production

# SSL
SSL_CERT=/app/certs/cert.pem
SSL_KEY=/app/certs/key.pem

# Сеть
CORS_ORIGIN=*
```

## 🛡️ Безопасность

- **Анонимность**: Без регистрации для пользователей
- **JWT авторизация**: Для админ-панели
- **Пароли**: PBKDF2 с солью (10000 итераций)
- **HTTPS**: Let's Encrypt или self-signed
- **Helmet**: Защита от XSS, CSRF, clickjacking
- **Rate Limiting**: Защита от brute-force
- **Автоудаление**: Истёкшие шары удаляются автоматически

## 🔄 Мониторинг соединения

Приложение динамически отслеживает доступность бэкенда:

- **Автоматическая проверка**: Каждые 5 секунд
- **Баннер при проблемах**: Красный баннер при отключении, жёлтый при деградации
- **Локальный режим**: При недоступности сервера работает localStorage
- **Автовосстановление**: Функционал возвращается автоматически при восстановлении связи
- **Индикатор статуса**: В хедере показывается текущее состояние соединения

### Статусы:
- 🟢 **Онлайн** — сервер доступен, полный функционал
- 🟡 **Проблемы** — сервер работает, но есть проблемы с БД
- 🔴 **Оффлайн** — сервер недоступен, локальный режим

## 📝 Лицензия

MIT
