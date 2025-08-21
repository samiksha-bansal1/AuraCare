#!/bin/bash

# Create SSL directory structure
mkdir -p ssl/conf ssl/certs ssl/private

# Create OpenSSL configuration
cat > ssl/conf/openssl.cnf << 'EOL'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = US
ST = California
L = San Francisco
O = AuraCare
OU = Development
emailAddress = admin@auracare.com
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
EOL

# Generate private key and self-signed certificate
openssl req -x509 \
  -newkey rsa:2048 \
  -nodes \
  -keyout ssl/private/privkey.pem \
  -out ssl/certs/cert.pem \
  -days 365 \
  -config ssl/conf/openssl.cnf \
  -extensions v3_req

# Create fullchain.pem (same as cert.pem for self-signed)
cp ssl/certs/cert.pem ssl/certs/fullchain.pem

# Create chain.pem (empty for self-signed)
touch ssl/certs/chain.pem

# Set proper permissions
chmod 600 ssl/private/*
chmod 644 ssl/certs/*

# Create dhparam.pem for stronger security
openssl dhparam -out ssl/dhparam.pem 2048

echo "SSL certificates generated successfully in ssl/ directory"
echo "Add these lines to your /etc/hosts file:"
echo "127.0.0.1   localhost"
echo ""
echo "To trust the certificate in your system:"
