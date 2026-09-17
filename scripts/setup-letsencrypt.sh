#!/bin/bash
# ============================================
# QuickShare — Let's Encrypt SSL Setup
# ============================================
# Usage:
#   ./scripts/setup-letsencrypt.sh your-domain.com admin@your-domain.com
#
# Prerequisites:
#   - Domain must point to this server
#   - Port 80 must be accessible (for ACME challenge)
#   - certbot installed: apt install certbot

set -e

DOMAIN=${1:-""}
EMAIL=${2:-""}

if [ -z "$DOMAIN" ]; then
  echo "❌ Usage: $0 <domain> <email>"
  echo "   Example: $0 example.com admin@example.com"
  exit 1
fi

if [ -z "$EMAIL" ]; then
  echo "❌ Email is required for Let's Encrypt"
  echo "   Usage: $0 <domain> <email>"
  exit 1
fi

echo "🔐 Setting up Let's Encrypt SSL for $DOMAIN"
echo "   Email: $EMAIL"
echo ""

# Check certbot
if ! command -v certbot &> /dev/null; then
  echo "📦 Installing certbot..."
  apt-get update && apt-get install -y certbot
fi

# Create certs directory
mkdir -p ./certs

# Stop any running server on port 80
echo "⏸️  Stopping server temporarily..."
docker compose down 2>/dev/null || true

# Get certificate
echo "🔑 Requesting certificate from Let's Encrypt..."
certbot certonly --standalone \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --cert-path ./certs/cert.pem \
  --key-path ./certs/key.pem

# Copy certificates to our location
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
if [ -d "$CERT_PATH" ]; then
  cp "$CERT_PATH/fullchain.pem" ./certs/cert.pem
  cp "$CERT_PATH/privkey.pem" ./certs/key.pem
  echo "✅ Certificates copied to ./certs/"
fi

# Set permissions
chmod 644 ./certs/cert.pem
chmod 600 ./certs/key.pem

echo ""
echo "✅ SSL configured successfully!"
echo ""
echo "🚀 Start the server:"
echo "   docker compose up -d"
echo ""
echo "🔄 Auto-renewal (add to crontab):"
echo "   0 0 1 * * certbot renew --quiet && docker compose restart"
echo ""
