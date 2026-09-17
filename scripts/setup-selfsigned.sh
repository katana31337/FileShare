#!/bin/bash
# ============================================
# QuickShare — Self-Signed SSL Certificate
# ============================================
# Usage:
#   ./scripts/setup-selfsigned.sh [domain]
#
# Generates a self-signed certificate for development/testing

set -e

DOMAIN=${1:-"localhost"}
CERT_DIR="./certs"

echo "🔐 Generating self-signed SSL certificate for: $DOMAIN"

mkdir -p "$CERT_DIR"

# Generate private key
openssl genrsa -out "$CERT_DIR/key.pem" 4096

# Generate certificate
openssl req -new -x509 \
  -key "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=QuickShare/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1"

# Set permissions
chmod 644 "$CERT_DIR/cert.pem"
chmod 600 "$CERT_DIR/key.pem"

echo ""
echo "✅ Self-signed certificate generated!"
echo "   Certificate: $CERT_DIR/cert.pem"
echo "   Private key: $CERT_DIR/key.pem"
echo "   Valid for:   365 days"
echo "   Domain:      $DOMAIN"
echo ""
echo "⚠️  Browsers will show a security warning."
echo "   For production, use Let's Encrypt instead."
echo ""
echo "🚀 Start the server:"
echo "   docker compose up -d"
echo ""
