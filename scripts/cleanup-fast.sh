#!/bin/bash
# ============================================
# QuickShare — Quick Cleanup (Fast)
# ============================================
# Мгновенное удаление всех контейнеров QuickShare без подтверждений
# Использование: ./scripts/cleanup-fast.sh

echo "🧹 Быстрая очистка QuickShare..."

# Остановить и удалить все контейнеры quickshare
docker ps -a --filter "name=quickshare" -q | xargs -r docker rm -f 2>/dev/null || true

# Удалить volumes (опционально, раскомментируйте если нужно)
# docker volume ls --filter "name=quickshare" -q | xargs -r docker volume rm -f 2>/dev/null || true

# Удалить networks
docker network ls --filter "name=quickshare" -q | xargs -r docker network rm 2>/dev/null || true

echo "✅ Готово!"
