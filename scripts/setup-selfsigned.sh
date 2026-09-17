#!/bin/bash
# ============================================
# QuickShare — Self-Signed SSL Certificate
# ============================================
# Usage:
#   ./scripts/setup-selfsigned.sh [domain]
#
# Generates a self-signed certificate for development/testing
# Supports local domains like: quickshare.local, myapp.lan, etc.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Interactive domain input if not provided
if [ -z "$1" ]; then
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║     🔐 QuickShare — Self-Signed Certificate Setup       ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${YELLOW}Enter the local domain for your QuickShare instance:${NC}"
  echo ""
  echo "  Examples:"
  echo "    • quickshare.local"
  echo "    • share.mycompany.lan"
  echo "    • 192.168.1.100"
  echo "    • localhost"
  echo ""
  read -p "  Domain/IP [localhost]: " DOMAIN
  DOMAIN=${DOMAIN:-localhost}
else
  DOMAIN=$1
fi

CERT_DIR="./certs"
DAYS=365

echo ""
echo -e "${BLUE}📋 Configuration:${NC}"
echo "   Domain:     $DOMAIN"
echo "   Output:     $CERT_DIR/"
echo "   Valid for:  $DAYS days"
echo ""

# Detect if domain is IP or hostname
if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${YELLOW}ℹ️  IP address detected. Adding to Subject Alternative Names...${NC}"
  SAN="IP:$DOMAIN,DNS:localhost,IP:127.0.0.1"
else
  echo -e "${YELLOW}ℹ️  Domain detected. Adding to Subject Alternative Names...${NC}"
  SAN="DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1"
  
  # Check if domain ends with .local, .lan, etc.
  if [[ $DOMAIN =~ \.(local|lan|internal|home)$ ]]; then
    echo -e "${YELLOW}ℹ️  Local domain detected. Adding wildcard for subdomains...${NC}"
    SAN="$SAN,DNS:*.$DOMAIN"
  fi
fi

echo ""
read -p "Continue? [Y/n]: " CONFIRM
CONFIRM=${CONFIRM:-Y}

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo -e "${BLUE}🔧 Generating SSL certificate...${NC}"

mkdir -p "$CERT_DIR"

# Create OpenSSL config
cat > "$CERT_DIR/openssl.cnf" << EOF
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

# Generate private key
echo -e "${BLUE}  → Generating private key (4096-bit RSA)...${NC}"
openssl genrsa -out "$CERT_DIR/key.pem" 4096 2>/dev/null

# Generate certificate
echo -e "${BLUE}  → Generating certificate...${NC}"
openssl req -new -x509 \
  -key "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days $DAYS \
  -config "$CERT_DIR/openssl.cnf" \
  -extensions v3_ext

# Set permissions
chmod 644 "$CERT_DIR/cert.pem"
chmod 600 "$CERT_DIR/key.pem"

# Clean up temp config
rm -f "$CERT_DIR/openssl.cnf"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ Certificate Generated!                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "   ${BLUE}Certificate:${NC} $CERT_DIR/cert.pem"
echo -e "   ${BLUE}Private key:${NC} $CERT_DIR/key.pem"
echo -e "   ${BLUE}Valid for:${NC}   $DAYS days"
echo -e "   ${BLUE}Domain:${NC}      $DOMAIN"
echo -e "   ${BLUE}SAN:${NC}         $SAN"
echo ""
echo -e "${YELLOW}⚠️  Browser Security Warning:${NC}"
echo "   Browsers will show a security warning because this is a"
echo "   self-signed certificate. This is normal for local development."
echo ""
echo -e "${YELLOW}📱 To trust the certificate on your devices:${NC}"
echo ""
echo "   macOS:"
echo "     1. Open Keychain Access"
echo "     2. Import $CERT_DIR/cert.pem"
echo "     3. Double-click → Trust → Always Trust"
echo ""
echo "   Windows:"
echo "     1. Run: mmc.exe → Add Certificate Snap-in"
echo "     2. Import cert.pem → Trusted Root Certification Authorities"
echo ""
echo "   Linux:"
echo "     sudo cp $CERT_DIR/cert.pem /usr/local/share/ca-certificates/"
echo "     sudo update-ca-certificates"
echo ""
echo "   iOS/Android:"
echo "     Transfer cert.pem to device and install as profile"
echo ""
echo -e "${GREEN}🚀 Start the server:${NC}"
echo "   docker compose up -d"
echo ""
echo -e "   Then visit: ${BLUE}https://$DOMAIN:3001${NC}"
echo ""
