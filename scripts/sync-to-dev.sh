#!/usr/bin/env bash
# Sincronizza questa copia (es. Desktop) verso la copia in ~/dev evitando di toccare node_modules, .next, .env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${DEV_PREVENTIVATORE_DIR:-$HOME/dev/preventivatore}"
if [[ ! -d "$DEST" ]]; then
  echo "Cartella di destinazione non trovata: $DEST" >&2
  echo "Crealo o imposta DEV_PREVENTIVATORE_DIR" >&2
  exit 1
fi
rsync -a \
  --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env \
  --exclude "preventivatore_BACKUP_v1_DO_NOT_RUN" \
  "$ROOT/" "$DEST/"
echo "Sincronizzato: $ROOT -> $DEST"
echo "Nella copia dev: cd \"$DEST\" && rm -rf .next && npm run dev"
