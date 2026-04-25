#!/bin/bash
# =====================================================================
# Aggiornamento Preventivatore Metodo Cantiere (da v1.0 a v1.1)
# Doppio-click: fa npm install, migra schema, ricarica listino + seed,
# lancia il dev server.
#
# Attenzione: il seed azzera i preventivi esistenti. Se ci tieni a
# qualcuno di loro, fermati ora e fai un dump del db (prisma/dev.db).
# =====================================================================

set -e
cd "$(dirname "$0")"

APP_DIR="$(pwd)"
if [[ "$APP_DIR" == *"backup"* ]] || [[ "$APP_DIR" == *"preventivatore_backup"* ]]; then
  echo ""
  echo "================================================"
  echo "  ERRORE: stai aggiornando dalla cartella BACKUP"
  echo "  Cartella: $APP_DIR"
  echo ""
  echo "  Esegui l'aggiornamento dentro la cartella principale:"
  echo "  .../preventivatore/aggiorna-preventivatore.command"
  echo "================================================"
  echo ""
  exit 1
fi

if [ ! -f "package.json" ] || [ ! -d "src" ] || [ ! -d "prisma" ]; then
  echo ""
  echo "================================================"
  echo "  ERRORE: cartella progetto non valida"
  echo "  Cartella: $APP_DIR"
  echo "================================================"
  echo ""
  exit 1
fi

if [ ! -f "prisma/schema.prisma" ] || ! grep -q "model DiscountCode" "prisma/schema.prisma"; then
  echo ""
  echo "================================================"
  echo "  ERRORE: questa NON sembra la v1.1 (schema vecchio)"
  echo "  (manca 'model DiscountCode' in prisma/schema.prisma)"
  echo ""
  echo "  Probabile causa: stai usando una cartella vecchia/backup."
  echo "  Aggiorna/avvia solo la cartella principale aggiornata."
  echo "================================================"
  echo ""
  exit 1
fi

echo ""
echo "================================================"
echo "  Preventivatore — aggiornamento v1.1"
echo "  Cartella: $(pwd)"
echo "================================================"
echo ""

# 1. Controllo Node
if ! command -v node >/dev/null 2>&1; then
  echo "Node non rilevato. Lancia prima avvia-preventivatore.command"
  echo "(si occupa lui di installare Homebrew + Node)."
  exit 1
fi
echo "Node attivo: $(node --version)"
echo ""

# 2. Install / update dipendenze
echo "Aggiorno le dipendenze (può impiegare 30-90 secondi)..."
npm install --no-audit --no-fund
echo ""

# 3. Migrazione schema sul dev.db esistente
echo "Applico le nuove colonne/tabelle al database..."
npx prisma db push
echo ""

# 4. Seed (ricarica listino, utenti e codici sconto di esempio)
echo "Ricarico listino, utenti e codici sconto..."
npm run db:seed
echo ""

# 5. Apre browser dopo 6 secondi
(sleep 6 && open "http://localhost:3000") &

echo "================================================"
echo "  Avvio dev server su http://localhost:3000"
echo "  Ctrl+C per fermare."
echo "================================================"
echo ""
npm run dev
