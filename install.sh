#!/bin/bash
# ============================================
# QuickShare — Interactive Installation Script
# ============================================
# Usage:
#   chmod +x install.sh
#   ./install.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Global variables
DOMAIN=""
PORT=""
DB_TYPE=""
ADMIN_PATH=""

# Print banner
print_banner() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║                                                          ║${NC}"
  echo -e "${CYAN}║     🔗 QuickShare — Installation Wizard                  ║${NC}"
  echo -e "${CYAN}║                                                          ║${NC}"
  echo -e "${CYAN}║     Анонимный обмен файлами и текстом                    ║${NC}"
  echo -e "${CYAN}║                                                          ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# Check prerequisites
check_prerequisites() {
  echo -e "${BLUE}🔍 Проверка зависимостей...${NC}"
  
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker не установлен${NC}"
    echo "Установите Docker: https://docs.docker.com/get-docker/"
    exit 1
  fi
  
  if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose не установлен${NC}"
    echo "Установите Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Docker и Docker Compose найдены${NC}"
  echo ""
}

# Select database
select_database() {
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  🗄️  Выбор базы данных                                   ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "  1) PostgreSQL (рекомендуется, быстрая установка)"
  echo "  2) MySQL / MariaDB (быстрая установка)"
  echo "  3) MongoDB (быстрая установка)"
  echo "  4) SQLite (требует компиляции нативных модулей, дольше)"
  echo ""
  read -p "Выберите базу данных [1-4, по умолчанию: 1]: " DB_CHOICE
  DB_CHOICE=${DB_CHOICE:-1}
  
  case $DB_CHOICE in
    1)
      DB_TYPE="postgres"
      DB_IMAGE="postgres:16-alpine"
      DB_PORT=5432
      echo -e "${GREEN}✓ Выбран PostgreSQL${NC}"
      ;;
    2)
      DB_TYPE="mysql"
      DB_IMAGE="mysql:8"
      DB_PORT=3306
      echo -e "${GREEN}✓ Выбран MySQL${NC}"
      ;;
    3)
      DB_TYPE="mongodb"
      DB_IMAGE="mongo:7"
      DB_PORT=27017
      echo -e "${GREEN}✓ Выбран MongoDB${NC}"
      ;;
    4)
      DB_TYPE="sqlite"
      echo -e "${GREEN}✓ Выбран SQLite${NC}"
      ;;
    *)
      echo -e "${RED}❌ Неверный выбор${NC}"
      exit 1
      ;;
  esac
  echo ""
}

# Configure database credentials
configure_database() {
  if [ "$DB_TYPE" != "sqlite" ]; then
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  🔐 Настройка базы данных                               ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    read -p "Имя базы данных [quickshare]: " DB_NAME
    DB_NAME=${DB_NAME:-quickshare}
    
    read -p "Пользователь БД [quickshare]: " DB_USER
    DB_USER=${DB_USER:-quickshare}
    
    read -sp "Пароль БД [quickshare_pass]: " DB_PASSWORD
    echo ""
    DB_PASSWORD=${DB_PASSWORD:-quickshare_pass}
    
    if [ "$DB_TYPE" = "mysql" ]; then
      read -sp "ROOT пароль MySQL [rootpass]: " DB_ROOT_PASSWORD
      echo ""
      DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD:-rootpass}
    fi
    
    echo -e "${GREEN}✓ Настройки базы данных сохранены${NC}"
    echo ""
  else
    DB_NAME=""
    DB_USER=""
    DB_PASSWORD=""
    DB_ROOT_PASSWORD=""
  fi
}

# Select SSL type
select_ssl() {
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  🔒 Настройка SSL/TLS                                   ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "  1) Let's Encrypt (для продакшена с доменом)"
  echo "  2) Self-signed сертификат (для разработки/локальной сети)"
  echo ""
  read -p "Выберите тип SSL [1-2, по умолчанию: 2]: " SSL_CHOICE
  SSL_CHOICE=${SSL_CHOICE:-2}
  
  case $SSL_CHOICE in
    1)
      setup_letsencrypt
      ;;
    2)
      setup_selfsigned
      ;;
    *)
      echo -e "${RED}❌ Неверный выбор${NC}"
      exit 1
      ;;
  esac
  echo ""
}

# Setup Let's Encrypt
setup_letsencrypt() {
  echo ""
  echo -e "${YELLOW}🔐 Настройка Let's Encrypt${NC}"
  echo ""
  
  read -p "Домен (например, example.com): " DOMAIN
  if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Домен обязателен для Let's Encrypt${NC}"
    exit 1
  fi
  
  read -p "Email для Let's Encrypt: " EMAIL
  if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Email обязателен для Let's Encrypt${NC}"
    exit 1
  fi
  
  # Check if certbot is installed
  if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Установка certbot...${NC}"
    if command -v apt-get &> /dev/null; then
      sudo apt-get update && sudo apt-get install -y certbot
    elif command -v yum &> /dev/null; then
      sudo yum install -y certbot
    else
      echo -e "${RED}❌ Не удалось установить certbot автоматически${NC}"
      echo "Установите certbot вручную: https://certbot.eff.org/instructions"
      exit 1
    fi
  fi
  
  # Stop any running containers on port 80
  echo -e "${YELLOW}⏸️  Остановка контейнеров на порту 80...${NC}"
  docker compose down 2>/dev/null || true
  
  # Get certificate
  echo -e "${YELLOW}🔑 Запрос сертификата от Let's Encrypt...${NC}"
  mkdir -p ./certs
  
  sudo certbot certonly --standalone \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --cert-path ./certs/cert.pem \
    --key-path ./certs/key.pem
  
  # Copy certificates
  CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
  if [ -d "$CERT_PATH" ]; then
    sudo cp "$CERT_PATH/fullchain.pem" ./certs/cert.pem
    sudo cp "$CERT_PATH/privkey.pem" ./certs/key.pem
  fi
  
  chmod 644 ./certs/cert.pem
  chmod 600 ./certs/key.pem
  
  echo -e "${GREEN}✅ Let's Encrypt сертификат получен${NC}"
  echo ""
  echo -e "${YELLOW}💡 Для автоматического обновления добавьте в crontab:${NC}"
  echo "   0 0 1 * * certbot renew --quiet && docker compose restart"
}

# Setup self-signed certificate
setup_selfsigned() {
  echo ""
  echo -e "${YELLOW}🔐 Настройка Self-signed сертификата${NC}"
  echo ""
  
  read -p "Локальный домен/IP [localhost]: " DOMAIN
  DOMAIN=${DOMAIN:-localhost}
  
  echo ""
  read -p "Срок действия в днях [365]: " DAYS
  DAYS=${DAYS:-365}
  
  mkdir -p ./certs
  
  # Detect if domain is IP
  if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    SAN="IP:$DOMAIN,DNS:localhost,IP:127.0.0.1"
  else
    SAN="DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1"
    if [[ $DOMAIN =~ \.(local|lan|internal|home)$ ]]; then
      SAN="$SAN,DNS:*.$DOMAIN"
    fi
  fi
  
  # Create OpenSSL config
  cat > ./certs/openssl.cnf << EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C = US
ST = State
L = City
O = QuickShare
OU = Development
CN = $DOMAIN

[req_ext]
subjectAltName = $SAN

[v3_ext]
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = $SAN
EOF
  
  echo -e "${BLUE}  → Генерация ключа...${NC}"
  openssl genrsa -out ./certs/key.pem 4096 2>/dev/null
  
  echo -e "${BLUE}  → Генерация сертификата...${NC}"
  openssl req -new -x509 \
    -key ./certs/key.pem \
    -out ./certs/cert.pem \
    -days $DAYS \
    -config ./certs/openssl.cnf \
    -extensions v3_ext
  
  chmod 644 ./certs/cert.pem
  chmod 600 ./certs/key.pem
  rm -f ./certs/openssl.cnf
  
  echo -e "${GREEN}✅ Self-signed сертификат создан${NC}"
  echo ""
  echo -e "${YELLOW}⚠️  Браузеры будут показывать предупреждение безопасности.${NC}"
  echo "Это нормально для локальной разработки."
}

# Configure port
configure_port() {
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  🌐 Настройка порта                                     ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  DEFAULT_PORT=443
  
  read -p "Порт для frontend [${DEFAULT_PORT}]: " PORT
  PORT=${PORT:-$DEFAULT_PORT}
  
  echo -e "${GREEN}✓ Порт: $PORT${NC}"
  echo ""
}

# Generate JWT secret
generate_jwt_secret() {
  JWT_SECRET=$(openssl rand -hex 32)
}

# Configure admin panel path
configure_admin_path() {
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  🔐 Настройка админ-панели                              ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${YELLOW}Придумайте секретный URL для доступа к админ-панели${NC}"
  echo -e "${GRAY}Это будет путь после домена, например: https://domain.com/YOUR_SECRET_PATH${NC}"
  echo ""
  echo -e "${CYAN}Рекомендации:${NC}"
  echo "  • Используйте случайную строку (например: my-secret-admin-xyz123)"
  echo "  • Минимум 8 символов"
  echo "  • Только буквы, цифры и дефисы"
  echo "  • Не используйте очевидные пути (admin, panel, etc.)"
  echo ""
  
  while true; do
    read -p "Секретный URL для админ-панели: " ADMIN_PATH
    
    # Validate input
    if [[ -z "$ADMIN_PATH" ]]; then
      echo -e "${RED}❌ URL не может быть пустым${NC}"
      continue
    fi
    
    if [[ ${#ADMIN_PATH} -lt 8 ]]; then
      echo -e "${RED}❌ URL должен содержать минимум 8 символов${NC}"
      continue
    fi
    
    if [[ ! "$ADMIN_PATH" =~ ^[a-zA-Z0-9-]+$ ]]; then
      echo -e "${RED}❌ URL может содержать только буквы, цифры и дефисы${NC}"
      continue
    fi
    
    # Check for common/obvious paths
    if [[ "$ADMIN_PATH" =~ ^(admin|panel|dashboard|manage|control|backend|cms)$ ]]; then
      echo -e "${YELLOW}⚠️  Этот путь слишком очевидный. Придумайте что-то более уникальное.${NC}"
      read -p "Продолжить с этим путём? [y/N]: " CONFIRM
      if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        continue
      fi
    fi
    
    break
  done
  
  echo ""
  echo -e "${GREEN}✓ Секретный URL: ${ADMIN_PATH}${NC}"
  echo ""
}

# Generate docker-compose.yml
generate_docker_compose() {
  echo -e "${BLUE}📝 Генерация docker-compose.yml...${NC}"
  
  cat > docker-compose.yml << EOF
# ============================================
# QuickShare — Auto-generated docker-compose.yml
# ============================================
# Generated: $(date)
# Database: $DB_TYPE
# SSL: Enabled (HTTPS)
# Port: $PORT

services:
  # Frontend - Nginx serving React app
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: quickshare-frontend
    restart: unless-stopped
    ports:
      - "${PORT}:443"
    volumes:
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - quickshare_net
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "--no-check-certificate", "https://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s

  # Backend - Node.js Express API
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
EOF

  # Add build args for SQLite optimization
  if [ "$DB_TYPE" = "sqlite" ]; then
    cat >> docker-compose.yml << EOF
      args:
        USE_SQLITE: "true"
EOF
  else
    cat >> docker-compose.yml << EOF
      args:
        USE_SQLITE: "false"
EOF
  fi

  cat >> docker-compose.yml << EOF
    container_name: quickshare-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3001
      - HOST=0.0.0.0
      - DB_TYPE=${DB_TYPE}
EOF

  # Add database-specific environment variables
  if [ "$DB_TYPE" = "postgres" ] || [ "$DB_TYPE" = "mysql" ]; then
    cat >> docker-compose.yml << EOF
      - DB_HOST=database
      - DB_PORT=${DB_PORT}
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
EOF
  elif [ "$DB_TYPE" = "mongodb" ]; then
    cat >> docker-compose.yml << EOF
      - DB_MONGO_URI=mongodb://database:27017/${DB_NAME}
EOF
  elif [ "$DB_TYPE" = "sqlite" ]; then
    cat >> docker-compose.yml << EOF
      - DB_SQLITE_PATH=/app/data/quickshare.db
EOF
  fi

  # Add JWT and Admin Path
  cat >> docker-compose.yml << EOF
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=http://frontend
      - ADMIN_PANEL_PATH=${ADMIN_PATH}
EOF

  # Add volumes and dependencies
  cat >> docker-compose.yml << EOF
    volumes:
      - backend_uploads:/app/data/uploads
EOF

  if [ "$DB_TYPE" = "sqlite" ]; then
    cat >> docker-compose.yml << EOF
      - backend_:/app/data
EOF
  fi

  if [ "$DB_TYPE" != "sqlite" ]; then
    cat >> docker-compose.yml << EOF
    depends_on:
      database:
        condition: service_healthy
EOF
  fi

  cat >> docker-compose.yml << EOF
    networks:
      - quickshare_net
    healthcheck:
      test: ["CMD", "node", "/app/healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

EOF

  # Add database service if not SQLite
  if [ "$DB_TYPE" != "sqlite" ]; then
    cat >> docker-compose.yml << EOF
  # Database - ${DB_TYPE}
  database:
    image: ${DB_IMAGE}
    container_name: quickshare-db
    restart: unless-stopped
EOF

    if [ "$DB_TYPE" = "postgres" ]; then
      cat >> docker-compose.yml << EOF
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_:/var/lib/postgresql/data
    networks:
      - quickshare_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5
EOF
    elif [ "$DB_TYPE" = "mysql" ]; then
      cat >> docker-compose.yml << EOF
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME}
      - MYSQL_USER=${DB_USER}
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_:/var/lib/mysql
    networks:
      - quickshare_net
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 10
EOF
    elif [ "$DB_TYPE" = "mongodb" ]; then
      cat >> docker-compose.yml << EOF
    volumes:
      - mongo_:/data/db
    networks:
      - quickshare_net
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 5s
      timeout: 5s
      retries: 5
EOF
    fi
  fi

  # Add volumes section
  cat >> docker-compose.yml << EOF

volumes:
EOF

  if [ "$DB_TYPE" = "postgres" ]; then
    cat >> docker-compose.yml << EOF
  postgres_:
    driver: local
EOF
  elif [ "$DB_TYPE" = "mysql" ]; then
    cat >> docker-compose.yml << EOF
  mysql_:
    driver: local
EOF
  elif [ "$DB_TYPE" = "mongodb" ]; then
    cat >> docker-compose.yml << EOF
  mongo_:
    driver: local
EOF
  elif [ "$DB_TYPE" = "sqlite" ]; then
    cat >> docker-compose.yml << EOF
  backend_:
    driver: local
EOF
  fi

  cat >> docker-compose.yml << EOF
  backend_uploads:
    driver: local

networks:
  quickshare_net:
    driver: bridge
EOF

  echo -e "${GREEN}✅ docker-compose.yml создан${NC}"
  echo ""
}

# Start installation
start_installation() {
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  🚀 Запуск установки                                    ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  # Check if docker-compose.yml exists
  if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ docker-compose.yml не найден!${NC}"
    exit 1
  fi
  
  # Build and start containers with progress
  echo -e "${CYAN}📦 Сборка контейнеров...${NC}"
  echo ""
  
  # Очистка только ресурсов QuickShare
  echo -e "${YELLOW}🧹 Очистка старых ресурсов QuickShare...${NC}"
  docker compose down --rmi local --volumes 2>/dev/null || true
  
  # Удаляем только образы и сети с именем quickshare
  docker images --filter "reference=*quickshare*" -q | xargs -r docker rmi -f 2>/dev/null || true
  docker network ls --filter "name=quickshare" -q | xargs -r docker network rm 2>/dev/null || true
  docker volume ls --filter "name=quickshare" -q | xargs -r docker volume rm -f 2>/dev/null || true
  echo ""
  
  # Build backend first
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}🔧 Сборка backend (Node.js + Express)...${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  if ! docker compose build --no-cache backend; then
    echo -e "${RED}❌ Ошибка сборки backend!${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Backend собран успешно${NC}"
  
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}🎨 Сборка frontend (React + Nginx)...${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  if ! docker compose build --no-cache frontend; then
    echo -e "${RED}❌ Ошибка сборки frontend!${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Frontend собран успешно${NC}"
  
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}🚀 Запуск всех сервисов...${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  if ! docker compose up -d; then
    echo -e "${RED}❌ Ошибка запуска сервисов!${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Все сервисы запущены${NC}"
  
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                                                          ║${NC}"
  echo -e "${GREEN}║     ✅ Установка завершена успешно!                      ║${NC}"
  echo -e "${GREEN}║                                                          ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  # Show access information
  PROTOCOL="https"
  
  echo -e "${CYAN}📊 Информация о системе:${NC}"
  echo ""
  echo -e "  ${BLUE}Frontend:${NC}  ${PROTOCOL}://${DOMAIN}:${PORT}"
  echo -e "  ${BLUE}Backend:${NC}   ${PROTOCOL}://${DOMAIN}:${PORT}/api"
  echo -e "  ${BLUE}База данных:${NC} ${DB_TYPE}"
  echo ""
  
  echo -e "${CYAN}🔐 Админ-панель:${NC}"
  echo ""
  
  # Если это локальный домен, показываем инструкцию для /etc/hosts
  if [[ "$DOMAIN" =~ \.(local|lan|internal|home)$ ]]; then
    echo -e "  ${YELLOW}⚠️  Для локального домена добавьте в /etc/hosts:${NC}"
    echo -e "     ${GRAY}sudo nano /etc/hosts${NC}"
    echo -e "     ${GRAY}127.0.0.1  ${DOMAIN}${NC}"
    echo ""
  fi
  
  echo -e "  ${BLUE}URL админ-панели:${NC} ${PROTOCOL}://${DOMAIN}:${PORT}/${ADMIN_PATH}"
  echo ""
  echo -e "  ${YELLOW}⚠️  Сохраните этот URL - он нужен для входа в админ-панель!${NC}"
  echo ""
  
  echo -e "${CYAN}📝 Полезные команды:${NC}"
  echo ""
  echo -e "  ${YELLOW}Просмотр логов:${NC}"
  echo "    docker compose logs -f"
  echo ""
  echo -e "  ${YELLOW}Остановка:${NC}"
  echo "    docker compose down"
  echo ""
  echo -e "  ${YELLOW}Перезапуск:${NC}"
  echo "    docker compose restart"
  echo ""
  echo -e "  ${YELLOW}Полная очистка:${NC}"
  echo "    ./scripts/cleanup.sh --all"
  echo ""
}

# Main installation flow
main() {
  print_banner
  check_prerequisites
  
  # Database selection FIRST (affects build process)
  select_database
  configure_database
  
  # Then other configurations
  select_ssl
  configure_port
  configure_admin_path
  generate_jwt_secret
  generate_docker_compose
  start_installation
}

# Run main
main
