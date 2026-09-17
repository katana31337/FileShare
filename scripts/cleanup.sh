#!/bin/bash
# ============================================
# QuickShare — Cleanup Script
# ============================================
# Usage:
#   ./scripts/cleanup.sh          # Остановить и удалить контейнеры
#   ./scripts/cleanup.sh --all    # Удалить контейнеры + volumes + images
#   ./scripts/cleanup.sh --force  # Принудительное удаление без подтверждений

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FORCE=false
REMOVE_ALL=false

for arg in "$@"; do
  case $arg in
    --force|-f)
      FORCE=true
      shift
      ;;
    --all|-a)
      REMOVE_ALL=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --force, -f    Принудительное удаление без подтверждений"
      echo "  --all, -a      Удалить контейнеры + volumes + images"
      echo "  --help, -h     Показать эту справку"
      echo ""
      echo "Examples:"
      echo "  $0               # Остановить и удалить контейнеры"
      echo "  $0 --all         # Полная очистка (контейнеры + volumes + images)"
      echo "  $0 --force       # Быстрое удаление без вопросов"
      exit 0
      ;;
  esac
done

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           🧹 QuickShare Cleanup Script                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Find all QuickShare containers
echo -e "${YELLOW}🔍 Поиск контейнеров QuickShare...${NC}"
CONTAINERS=$(docker ps -a --filter "name=quickshare" --format "{{.Names}}" 2>/dev/null || true)

if [ -z "$CONTAINERS" ]; then
  echo -e "${GREEN}✅ Контейнеры QuickShare не найдены${NC}"
  exit 0
fi

echo -e "${BLUE}Найдены контейнеры:${NC}"
echo "$CONTAINERS" | while read -r container; do
  STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
  echo "  • $container ($STATUS)"
done
echo ""

# Confirmation
if [ "$FORCE" = false ]; then
  if [ "$REMOVE_ALL" = true ]; then
    echo -e "${RED}⚠️  ВНИМАНИЕ: Будут удалены контейнеры, volumes и images!${NC}"
    echo -e "${RED}   Все данные будут потеряны!${NC}"
  else
    echo -e "${YELLOW}⚠️  Контейнеры будут остановлены и удалены${NC}"
  fi
  echo ""
  read -p "Продолжить? [y/N]: " CONFIRM
  
  if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Отменено."
    exit 0
  fi
fi

echo ""
echo -e "${BLUE}🛑 Остановка контейнеров...${NC}"
docker stop $CONTAINERS 2>/dev/null || true

echo -e "${BLUE}🗑️  Удаление контейнеров...${NC}"
docker rm -f $CONTAINERS 2>/dev/null || true

echo -e "${GREEN}✅ Контейнеры удалены${NC}"

# Remove volumes if --all flag
if [ "$REMOVE_ALL" = true ]; then
  echo ""
  echo -e "${YELLOW}🗂️  Поиск volumes...${NC}"
  VOLUMES=$(docker volume ls --filter "name=quickshare" --format "{{.Name}}" 2>/dev/null || true)
  
  if [ -n "$VOLUMES" ]; then
    echo -e "${BLUE}Найдены volumes:${NC}"
    echo "$VOLUMES" | while read -r volume; do
      echo "  • $volume"
    done
    echo ""
    
    echo -e "${BLUE}🗑️  Удаление volumes...${NC}"
    docker volume rm -f $VOLUMES 2>/dev/null || true
    echo -e "${GREEN}✅ Volumes удалены${NC}"
  else
    echo -e "${GREEN}✅ Volumes не найдены${NC}"
  fi
  
  # Remove images
  echo ""
  echo -e "${YELLOW}🖼️  Поиск images...${NC}"
  IMAGES=$(docker images --filter "reference=*quickshare*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null || true)
  
  if [ -n "$IMAGES" ]; then
    echo -e "${BLUE}Найдены images:${NC}"
    echo "$IMAGES" | while read -r image; do
      echo "  • $image"
    done
    echo ""
    
    echo -e "${BLUE}🗑️  Удаление images...${NC}"
    docker rmi -f $IMAGES 2>/dev/null || true
    echo -e "${GREEN}✅ Images удалены${NC}"
  else
    echo -e "${GREEN}✅ Images не найдены${NC}"
  fi
  
  # Remove networks
  echo ""
  echo -e "${YELLOW}🌐 Поиск networks...${NC}"
  NETWORKS=$(docker network ls --filter "name=quickshare" --format "{{.Name}}" 2>/dev/null || true)
  
  if [ -n "$NETWORKS" ]; then
    echo -e "${BLUE}Найдены networks:${NC}"
    echo "$NETWORKS" | while read -r network; do
      echo "  • $network"
    done
    echo ""
    
    echo -e "${BLUE}🗑️  Удаление networks...${NC}"
    docker network rm $NETWORKS 2>/dev/null || true
    echo -e "${GREEN}✅ Networks удалены${NC}"
  else
    echo -e "${GREEN}✅ Networks не найдены${NC}"
  fi
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ Очистка завершена!                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$REMOVE_ALL" = true ]; then
  echo -e "${YELLOW}💡 Все данные QuickShare были удалены${NC}"
else
  echo -e "${BLUE}💡 Для полной очистки используйте: $0 --all${NC}"
fi
echo ""
