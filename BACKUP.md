# 📦 Перенос QuickShare на другой сервер

## Что хранится в `/fileshare_datastore`

Все загруженные пользователями файлы хранятся в каталоге хоста:

```
/fileshare_datastore/
├── abc123def456.jpg
├── xyz789uvw012.pdf
└── ...
```

## Бэкап

### Полный бэкап

```bash
# Создать архив со всеми файлами
sudo tar -czf quickshare-backup-$(date +%Y%m%d).tar.gz /fileshare_datastore

# Или использовать rsync для инкрементального бэкапа
sudo rsync -av /fileshare_datastore/ /backup/quickshare/
```

### Бэкап базы данных

```bash
# PostgreSQL
docker compose exec database pg_dump -U quickshare quickshare > db-backup.sql

# MySQL
docker compose exec database mysqldump -u quickshare -p quickshare > db-backup.sql

# MongoDB
docker compose exec database mongodump --db quickshare --out /tmp/backup
docker compose cp database:/tmp/backup ./mongo-backup
```

## Перенос на другой сервер

### 1. На старом сервере

```bash
# Остановить контейнеры
docker compose down

# Создать архив с файлами
sudo tar -czf quickshare-files.tar.gz /fileshare_datastore

# Создать бэкап БД (выберите вашу БД)
docker compose exec database pg_dump -U quickshare quickshare > db-backup.sql

# Скопировать на новый сервер
scp quickshare-files.tar.gz db-backup.sql user@new-server:/tmp/
scp -r /path/to/quickshare user@new-server:/opt/
```

### 2. На новом сервере

```bash
# Перейти в директорию проекта
cd /opt/quickshare

# Распаковать файлы
sudo tar -xzf /tmp/quickshare-files.tar.gz -C /

# Проверить, что каталог создан
ls -la /fileshare_datastore

# Восстановить базу данных (PostgreSQL)
docker compose up -d database
sleep 5
docker compose exec -T database psql -U quickshare quickshare < /tmp/db-backup.sql

# Запустить все сервисы
docker compose up -d
```

## Восстановление после сбоя

Если сервер упал и нужно восстановить только файлы:

```bash
# Создать каталог
sudo mkdir -p /fileshare_datastore
sudo chmod 777 /fileshare_datastore

# Восстановить из бэкапа
sudo tar -xzf quickshare-backup-20260919.tar.gz -C /

# Запустить контейнеры
docker compose up -d
```

## Очистка старых файлов

```bash
# Удалить файлы старше 30 дней
sudo find /fileshare_datastore -type f -mtime +30 -delete

# Посмотреть размер каталога
du -sh /fileshare_datastore

# Посмотреть количество файлов
ls /fileshare_datastore | wc -l
```

## Мониторинг

```bash
# Проверить свободное место
df -h /fileshare_datastore

# Проверить права доступа
ls -ld /fileshare_datastore

# Проверить, что контейнер может писать в каталог
docker compose exec backend touch /app/data/uploads/test.txt
docker compose exec backend rm /app/data/uploads/test.txt
```

## Важные замечания

1. **Права доступа**: Каталог `/fileshare_datastore` должен иметь права `777` или принадлежать пользователю с UID `1000`
2. **SELinux/AppArmor**: Если используется SELinux, может потребоваться настройка контекста:
   ```bash
   sudo chcon -Rt svirt_sandbox_file_t /fileshare_datastore
   ```
3. **Бэкапы**: Регулярно делайте бэкапы каталога `/fileshare_datastore` и базы данных
4. **Мониторинг диска**: Следите за свободным местом на диске

## Автоматический бэкап (cron)

```bash
# Добавить в crontab (ежедневный бэкап в 3:00)
0 3 * * * /usr/bin/tar -czf /backup/quickshare-$(date +\%Y\%m\%d).tar.gz /fileshare_datastore
0 3 * * * docker compose exec -T database pg_dump -U quickshare quickshare > /backup/db-$(date +\%Y\%m\%d).sql
```
