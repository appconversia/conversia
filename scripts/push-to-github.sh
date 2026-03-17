#!/bin/bash
# Sube el código a GitHub. Ejecuta: ./scripts/push-to-github.sh TU_TOKEN
# O: GITHUB_TOKEN=xxx ./scripts/push-to-github.sh

set -e
cd "$(dirname "$0")/.."

TOKEN="${1:-$GITHUB_TOKEN}"
if [ -z "$TOKEN" ]; then
  echo "Uso: $0 <token>" 
  echo "O: GITHUB_TOKEN=xxx $0"
  echo ""
  echo "Crea un token en: https://github.com/settings/tokens"
  echo "Permisos necesarios: repo"
  exit 1
fi

git remote set-url origin "https://x-access-token:${TOKEN}@github.com/yjbarriles/botyjbarriles.git"
git push origin main
git remote set-url origin "https://github.com/yjbarriles/botyjbarriles.git"
echo "Listo."