#!/bin/bash
# Быстрая переустановка QuickShare

echo "🧹 Удаление старых ресурсов QuickShare..."
docker compose down --rmi local --volumes 2>/dev/null || true

# Удаляем только образы и сети с именем quickshare
docker images --filter "reference=*quickshare*" -q | xargs -r docker rmi -f 2>/dev/null || true
docker network ls --filter "name=quickshare" -q | xargs -r docker network rm 2>/dev/null || true
docker volume ls --filter "name=quickshare" -q | xargs -r docker volume rm -f 2>/dev/null || true

echo "🗑️  Удаление старого docker-compose.yml..."
rm -f docker-compose.yml

echo "🚀 Запуск install.sh..."
./install.sh
