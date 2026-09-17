#!/bin/bash
# Быстрая переустановка QuickShare

echo "🧹 Удаление старых контейнеров и кэша..."
docker compose down --rmi local 2>/dev/null || true
docker builder prune -f 2>/dev/null || true

echo "🗑️  Удаление старого docker-compose.yml..."
rm -f docker-compose.yml

echo "🚀 Запуск install.sh..."
./install.sh
