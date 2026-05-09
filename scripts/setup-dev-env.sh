#!/bin/bash

# Script para configurar .env.local con la IP local correcta
# Uso: bash scripts/setup-dev-env.sh

echo "🔧 Configurando entorno de desarrollo..."
echo ""

# Detectar IP según el SO
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  IP=$(hostname -I | awk '{print $1}')
else
  # Windows (Git Bash)
  IP=$(ipconfig | grep "IPv4" | head -1 | awk '{print $NF}')
fi

if [ -z "$IP" ]; then
  echo "❌ No se pudo detectar la IP automáticamente"
  echo "Por favor, ingresa tu IP local manualmente:"
  read -p "IP: " IP
fi

echo "📍 IP detectada: $IP"
echo ""

# Crear .env.local
cat > .env.local << EOF
# Backend API URL - Desarrollo (IP Local)
# Este archivo es ignorado por Git y solo se usa en desarrollo local
# Generado automáticamente por setup-dev-env.sh
EXPO_PUBLIC_API_URL=http://$IP:3000
EOF

echo "✅ .env.local creado con éxito"
echo ""
echo "📝 Contenido de .env.local:"
cat .env.local
echo ""
echo "🚀 Ahora puedes ejecutar: npm start"
