# 🔗 QuickShare v2.0 — Анонимный обмен файлами и текстом

Микросервисное приложение для анонимного обмена файлами и текстом через короткие ссылки. 

**Архитектура:**
- **Frontend** — React + Nginx (статика + reverse proxy)
- **Backend** — Node.js + Express API
- **Database** — PostgreSQL (по умолчанию), MySQL, MongoDB, SQLite

Поддерживает Docker-развёртывание, HTTPS, админ-панель с настраиваемым URL.

## 🏗️ Архитектура

### Микросервисная архитектура

Приложение разделено на три независимых контейнера:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Frontend   │─────▶│   Backend   │─────▶│  Database   │
│   (Nginx)   │      │  (Node.js)  │      │ (PostgreSQL)│
│  Port 443   │ HTTP │  Port 3001  │      │  Port 5432  │
│  (HTTPS)    │─────▶│   (HTTP)    │      │             │
└─────────────┘      └─────────────┘      └─────────────┘
     React               Express            Multi-DB
   Static files         REST API           (SQLite/PG/
   SSL Termination      JWT Auth            MySQL/Mongo)
   Reverse proxy
```

**SSL Termination на Nginx:**
- Nginx обрабатывает HTTPS соединения (порт 443)
- Backend работает на HTTP внутри Docker сети (порт 3001)
- SSL сертификаты монтируются только в Nginx контейнер
- Это стандартная практика для микросервисной архитектуры

**Преимущества:**
- 🚀 **Независимое масштабирование** — можно запустить несколько инстансов backend
- 🔄 **Быстрые обновления** — frontend и backend обновляются отдельно
- 🛡️ **Изоляция** — проблемы в одном контейнере не влияют на другие
- 📦 **Оптимизация** — каждый контейнер использует только нужные зависимости
- 🔧 **Гибкость** — можно заменить Nginx на другой reverse proxy

### Принципы SOLID

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
│   ├── cleanup.sh                # Полная очистка (с опциями)
│   ├── cleanup-fast.sh           # Быстрая очистка (без подтверждений)
│   └── cleanup.bat               # Очистка для Windows
│
├── Dockerfile.frontend           # Frontend: Nginx + React
├── Dockerfile.backend            # Backend: Node.js + Express
├── nginx.conf                    # Nginx конфигурация (reverse proxy)
├── install.sh                    # Интерактивный мастер установки
├── .env.example                  # Пример конфигурации
└── README.md
```

## 🚀 Быстрый старт

### Установка (рекомендуется):

```bash
chmod +x install.sh
./install.sh
```

Интерактивный мастер установки:
- 🎯 Выбор базы данных (PostgreSQL / MySQL / MongoDB / SQLite)
- 🔐 Настройка SSL (Let's Encrypt / Self-signed / Без SSL)
- 🌐 Выбор порта
- 📝 Автоматическая генерация docker-compose.yml
- 🚀 Запуск контейнеров

### Ручной запуск (если docker-compose.yml уже есть):

```bash
docker compose up -d
```

### Разработка:

Frontend и backend можно разрабатывать параллельно:

```bash
# Терминал 1: Frontend (React + Vite)
npm install
npm run dev
# Запустится на http://localhost:3000

# Терминал 2: Backend (Express)
cd server
npm install
npm run dev
# Запустится на http://localhost:3001
```

Frontend автоматически проксирует `/api` запросы на backend через Vite dev server.

## 🧹 Скрипты очистки

### Полная очистка (Linux/macOS)

```bash
# Сделать скрипт исполняемым
chmod +x scripts/cleanup.sh

# Остановить и удалить контейнеры
./scripts/cleanup.sh

# Полная очистка (контейнеры + volumes + images)
./scripts/cleanup.sh --all

# Быстрое удаление без подтверждений
./scripts/cleanup.sh --force
```

### Быстрая очистка (Linux/macOS)

```bash
chmod +x scripts/cleanup-fast.sh
./scripts/cleanup-fast.sh
```

### Очистка для Windows

```cmd
scripts\cleanup.bat
```

### Опции скрипта cleanup.sh

| Опция | Описание |
|-------|----------|
| `--force`, `-f` | Принудительное удаление без подтверждений |
| `--all`, `-a` | Удалить контейнеры + volumes + images |
| `--help`, `-h` | Показать справку |

## 🔐 HTTPS / SSL

Настройка SSL происходит через интерактивный мастер установки `./install.sh`:

### Self-signed (для разработки):
При выборе опции "Self-signed" в install.sh:
- Укажите локальный домен (quickshare.local, share.lan, 192.168.1.100)
- Автоматически добавит SAN для поддоменов
- Инструкции по установке сертификата в ОС будут выведены после генерации

### Let's Encrypt (для продакшена):
При выборе опции "Let's Encrypt" в install.sh:
- Укажите домен и email
- Автоматически установит certbot если нужно
- Получит и настроит сертификат
- Настроит автообновление через crontab

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

## 🐳 Docker Compose

### Архитектура контейнеров

Приложение использует три контейнера:
- **frontend** — Nginx, отдаёт React приложение и проксирует `/api` на backend
- **backend** — Node.js Express API сервер
- **database** — выбранная СУБД (PostgreSQL/MySQL/MongoDB/SQLite)

### Установка

```bash
# Интерактивная установка (рекомендуется)
chmod +x install.sh
./install.sh
```

Мастер установки:
1. **Выберет базу данных** (PostgreSQL по умолчанию)
2. Настроит SSL сертификат
3. Сгенерирует docker-compose.yml
4. Запустит контейнеры

**Почему PostgreSQL по умолчанию?**
- ✅ Быстрая установка (не требует компиляции нативных модулей)
- ✅ Рекомендуется для продакшена
- ✅ Лучшая производительность и масштабируемость
- ✅ Надёжность и стабильность

**Когда выбирать SQLite?**
- Только для разработки/тестирования
- ⚠️ Требует компиляции нативных модулей (дольше установка)
- ⚠️ Не рекомендуется для продакшена

### Масштабирование

Frontend и backend можно масштабировать независимо:

```bash
# Запустить 3 инстанса backend
docker compose up -d --scale backend=3
```

## 🔧 Переменные окружения

### Frontend (Nginx)
```env
PORT=80                 # Порт для HTTP (по умолчанию 80)
```

### Backend (Node.js)
```env
# Сервер
PORT=3001               # Внутренний порт API
HOST=0.0.0.0
NODE_ENV=production

# База данных
DB_TYPE=postgres        # sqlite | postgres | mysql | mongodb
DB_HOST=postgres        # Хост БД (имя контейнера в Docker)
DB_PORT=5432
DB_NAME=quickshare
DB_USER=quickshare
DB_PASSWORD=secret
DB_MONGO_URI=mongodb://mongo:27017/quickshare  # Для mongodb

# Безопасность
JWT_SECRET=change-me-in-production

# SSL
SSL_CERT=/app/certs/cert.pem
SSL_KEY=/app/certs/key.pem

# Сеть
CORS_ORIGIN=http://frontend  # Для Docker, или * для разработки
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
