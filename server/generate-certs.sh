#!/bin/bash
# Generate self-signed SSL certificate for QuickShare server

CERT_DIR="./certs"
mkdir -p "$CERT_DIR"

echo "🔐 Generating self-signed SSL certificate..."

openssl req -x509 \
  -newkey rsa:4096 \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days 365 \
  -nodes \
  -subj "/C=US/ST=State/L=City/O=QuickShare/CN=localhost"

echo "✅ Certificates generated:"
echo "   - $CERT_DIR/cert.pem"
echo "   - $CERT_DIR/key.pem"
echo ""
echo "🚀 Start server with HTTPS:"
echo "   npm start"
