#!/bin/bash
# =====================================================================
# Avvio Preventivatore Metodo Cantiere
# Doppio-click su questo file dal Finder per lanciare l'applicazione.
# =====================================================================

set -e

# Si posiziona nella cartella dello script, qualunque sia il cwd iniziale.
cd "$(dirname "$0")"

echo ""
echo "================================================"
echo "  Preventivatore Metodo Cantiere"
echo "  Cartella: $(pwd)"
echo "================================================"
echo ""

# ---------------------------------------------------------------------
# 1. Verifica Node.js (serve >= 18)
# ---------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js non rilevato sul sistema."

  # Controlla Homebrew; se manca lo installa.
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew non presente. Installazione in corso (ti chiederà la password)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Carica l'ambiente di brew (path diverso fra Apple Silicon e Intel).
    if [ -x /opt/homebrew/bin/brew ]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x /usr/local/bin/brew ]; then
      eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi

  echo "Installo Node.js via Homebrew..."
  brew install node
else
  NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
  if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Hai Node $(node --version), troppo vecchio. Serve almeno la 18."
    if command -v brew >/dev/null 2>&1; then
      echo "Aggiorno Node con Homebrew..."
      brew upgrade node || brew install node
    else
      echo "Homebrew non c'è. Aggiorna Node manualmente da https://nodejs.org e rilancia."
      exit 1
    fi
  fi
fi

echo "Node attivo: $(node --version)"
echo ""

# ---------------------------------------------------------------------
# 2. Installazione dipendenze (solo se node_modules non c'è già)
# ---------------------------------------------------------------------
if [ ! -d "node_modules" ]; then
  echo "Installo le dipendenze (1-3 minuti)..."
  npm install
else
  echo "Dipendenze già installate (node_modules presente)."
fi
echo ""

# ---------------------------------------------------------------------
# 3. Database SQLite + seed (solo al primo avvio)
# ---------------------------------------------------------------------
if [ ! -f "prisma/dev.db" ]; then
  echo "Creo il database SQLite..."
  npx prisma db push

  echo ""
  echo "Popolo il listino e creo gli utenti..."
  npm run db:seed
else
  echo "Database già presente (prisma/dev.db). Salto push e seed."
fi
echo ""

# ---------------------------------------------------------------------
# 4. Apre il browser dopo qualche secondo, in parallelo al dev server
# ---------------------------------------------------------------------
(sleep 6 && open "http://localhost:3000") &

# ---------------------------------------------------------------------
# 5. Avvio dev server in foreground (Ctrl+C per fermarlo)
# ---------------------------------------------------------------------
echo "================================================"
echo "  Avvio server di sviluppo su http://localhost:3000"
echo "  Premi Ctrl+C in questa finestra per fermarlo."
echo "================================================"
echo ""
npm run dev
