## Struttura directory

Output del comando `tree -L 4 -I 'node_modules|.next|dist|.git' .` (fallback usato: `find ... | sort`)

```
./.DS_Store
./.env
./.env.example
./.gitignore
./.next_obsolete_v10/app-build-manifest.json
./.next_obsolete_v10/build-manifest.json
./.next_obsolete_v10/cache/webpack/client-development/0.pack.gz
./.next_obsolete_v10/cache/webpack/client-development/1.pack.gz
./.next_obsolete_v10/cache/webpack/client-development/2.pack.gz
./.next_obsolete_v10/cache/webpack/client-development/3.pack.gz
./.next_obsolete_v10/cache/webpack/client-development/index.pack.gz
./.next_obsolete_v10/cache/webpack/client-development/index.pack.gz.old
./.next_obsolete_v10/cache/webpack/edge-server-development/0.pack.gz
./.next_obsolete_v10/cache/webpack/edge-server-development/index.pack.gz
./.next_obsolete_v10/cache/webpack/server-development/0.pack.gz
./.next_obsolete_v10/cache/webpack/server-development/1.pack.gz
./.next_obsolete_v10/cache/webpack/server-development/2.pack.gz
./.next_obsolete_v10/cache/webpack/server-development/3.pack.gz
./.next_obsolete_v10/cache/webpack/server-development/4.pack.gz
./.next_obsolete_v10/cache/webpack/server-development/5.pack.gz
./.next_obsolete_v10/cache/webpack/server-development/6.pack.gz
./.next_obsolete_v10/cache/webpack/server-development/7.pack.gz
./.next_obsolete_v10/cache/webpack/server-development/index.pack.gz
./.next_obsolete_v10/cache/webpack/server-development/index.pack.gz.old
./.next_obsolete_v10/package.json
./.next_obsolete_v10/react-loadable-manifest.json
./.next_obsolete_v10/server/app-paths-manifest.json
./.next_obsolete_v10/server/app/(authenticated)/preventivi/[id]/page.js
./.next_obsolete_v10/server/app/(authenticated)/preventivi/[id]/page_client-reference-manifest.js
./.next_obsolete_v10/server/app/(authenticated)/preventivi/nuovo/page.js
./.next_obsolete_v10/server/app/(authenticated)/preventivi/nuovo/page_client-reference-manifest.js
./.next_obsolete_v10/server/app/(authenticated)/preventivi/page.js
./.next_obsolete_v10/server/app/(authenticated)/preventivi/page_client-reference-manifest.js
./.next_obsolete_v10/server/app/api/auth/[...nextauth]/route.js
./.next_obsolete_v10/server/app/api/products/route.js
./.next_obsolete_v10/server/app/api/quotes/[id]/route.js
./.next_obsolete_v10/server/app/api/quotes/create/route.js
./.next_obsolete_v10/server/app/api/quotes/route.js
./.next_obsolete_v10/server/app/login/page.js
./.next_obsolete_v10/server/app/login/page_client-reference-manifest.js
./.next_obsolete_v10/server/edge-runtime-webpack.js
./.next_obsolete_v10/server/interception-route-rewrite-manifest.js
./.next_obsolete_v10/server/middleware-build-manifest.js
./.next_obsolete_v10/server/middleware-manifest.json
./.next_obsolete_v10/server/middleware-react-loadable-manifest.js
./.next_obsolete_v10/server/next-font-manifest.js
./.next_obsolete_v10/server/next-font-manifest.json
./.next_obsolete_v10/server/pages-manifest.json
./.next_obsolete_v10/server/server-reference-manifest.js
./.next_obsolete_v10/server/server-reference-manifest.json
./.next_obsolete_v10/server/src/middleware.js
./.next_obsolete_v10/server/static/webpack/633457081244afec._.hot-update.json
./.next_obsolete_v10/server/vendor-chunks/@babel.js
./.next_obsolete_v10/server/vendor-chunks/@panva.js
./.next_obsolete_v10/server/vendor-chunks/@swc.js
./.next_obsolete_v10/server/vendor-chunks/bcryptjs.js
./.next_obsolete_v10/server/vendor-chunks/cookie.js
./.next_obsolete_v10/server/vendor-chunks/jose.js
./.next_obsolete_v10/server/vendor-chunks/lru-cache.js
./.next_obsolete_v10/server/vendor-chunks/next-auth.js
./.next_obsolete_v10/server/vendor-chunks/next.js
./.next_obsolete_v10/server/vendor-chunks/oauth.js
./.next_obsolete_v10/server/vendor-chunks/object-hash.js
./.next_obsolete_v10/server/vendor-chunks/oidc-token-hash.js
./.next_obsolete_v10/server/vendor-chunks/openid-client.js
./.next_obsolete_v10/server/vendor-chunks/preact-render-to-string.js
./.next_obsolete_v10/server/vendor-chunks/preact.js
./.next_obsolete_v10/server/vendor-chunks/uuid.js
./.next_obsolete_v10/server/vendor-chunks/yallist.js
./.next_obsolete_v10/server/webpack-runtime.js
./.next_obsolete_v10/static/chunks/app-pages-internals.js
./.next_obsolete_v10/static/chunks/app/(authenticated)/layout.js
./.next_obsolete_v10/static/chunks/app/(authenticated)/preventivi/[id]/page.js
./.next_obsolete_v10/static/chunks/app/(authenticated)/preventivi/nuovo/page.js
./.next_obsolete_v10/static/chunks/app/(authenticated)/preventivi/page.js
./.next_obsolete_v10/static/chunks/app/layout.js
./.next_obsolete_v10/static/chunks/app/login/page.js
./.next_obsolete_v10/static/chunks/main-app.js
./.next_obsolete_v10/static/chunks/polyfills.js
./.next_obsolete_v10/static/chunks/webpack.js
./.next_obsolete_v10/static/css/app/layout.css
./.next_obsolete_v10/static/development/_buildManifest.js
./.next_obsolete_v10/static/development/_ssgManifest.js
./.next_obsolete_v10/static/webpack/2b6db24c75ee45a1.webpack.hot-update.json
./.next_obsolete_v10/static/webpack/39b4e5e946926a58.webpack.hot-update.json
./.next_obsolete_v10/static/webpack/633457081244afec._.hot-update.json
./.next_obsolete_v10/static/webpack/639c394f4fc0bae4.webpack.hot-update.json
./.next_obsolete_v10/static/webpack/app/layout.639c394f4fc0bae4.hot-update.js
./.next_obsolete_v10/static/webpack/f864ec0e46034a38.webpack.hot-update.json
./.next_obsolete_v10/static/webpack/webpack.2b6db24c75ee45a1.hot-update.js
./.next_obsolete_v10/static/webpack/webpack.39b4e5e946926a58.hot-update.js
./.next_obsolete_v10/static/webpack/webpack.639c394f4fc0bae4.hot-update.js
./.next_obsolete_v10/static/webpack/webpack.f864ec0e46034a38.hot-update.js
./.next_obsolete_v10/trace
./.next_obsolete_v10/types/app/(authenticated)/layout.ts
./.next_obsolete_v10/types/app/(authenticated)/preventivi/[id]/page.ts
./.next_obsolete_v10/types/app/(authenticated)/preventivi/nuovo/page.ts
./.next_obsolete_v10/types/app/(authenticated)/preventivi/page.ts
./.next_obsolete_v10/types/app/api/auth/[...nextauth]/route.ts
./.next_obsolete_v10/types/app/api/products/route.ts
./.next_obsolete_v10/types/app/api/quotes/[id]/route.ts
./.next_obsolete_v10/types/app/api/quotes/create/route.ts
./.next_obsolete_v10/types/app/api/quotes/route.ts
./.next_obsolete_v10/types/app/layout.ts
./.next_obsolete_v10/types/app/login/page.ts
./.next_obsolete_v10/types/package.json
./README.md
./_test_write
./_trash_test/file.txt
./aggiorna-preventivatore.command
./avvia-preventivatore.command
./next-env.d.ts
./next.config.js
./package-lock.json
./package.json
./postcss.config.js
./preventivatore-metodo-cantiere-v1.1.zip
./preventivatore_BACKUP_v1_DO_NOT_RUN/.env
./preventivatore_BACKUP_v1_DO_NOT_RUN/.env.example
./preventivatore_BACKUP_v1_DO_NOT_RUN/.gitignore
./preventivatore_BACKUP_v1_DO_NOT_RUN/README.md
./preventivatore_BACKUP_v1_DO_NOT_RUN/avvia-preventivatore.command
./preventivatore_BACKUP_v1_DO_NOT_RUN/next-env.d.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/next.config.js
./preventivatore_BACKUP_v1_DO_NOT_RUN/package-lock.json
./preventivatore_BACKUP_v1_DO_NOT_RUN/package.json
./preventivatore_BACKUP_v1_DO_NOT_RUN/postcss.config.js
./preventivatore_BACKUP_v1_DO_NOT_RUN/prisma/dev.db
./preventivatore_BACKUP_v1_DO_NOT_RUN/prisma/schema.prisma
./preventivatore_BACKUP_v1_DO_NOT_RUN/prisma/seed.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/(authenticated)/admin/listino/page.tsx
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/(authenticated)/admin/utenti/page.tsx
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/(authenticated)/layout.tsx
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/(authenticated)/preventivi/[id]/page.tsx
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/(authenticated)/preventivi/nuovo/page.tsx
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/(authenticated)/preventivi/page.tsx
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/api/auth/[...nextauth]/route.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/api/products/[id]/route.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/api/products/route.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/api/quotes/[id]/route.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/api/quotes/create/route.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/api/quotes/route.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/api/users/[id]/route.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/api/users/route.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/globals.css
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/layout.tsx
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/login/page.tsx
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/page.tsx
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/app/providers.tsx
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/components/Navbar.tsx
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/lib/auth.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/lib/prisma.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/middleware.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/src/types/next-auth.d.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/tailwind.config.ts
./preventivatore_BACKUP_v1_DO_NOT_RUN/tsconfig.json
./prisma/dev.db
./prisma/schema.prisma
./prisma/seed.ts
./src/.DS_Store
./src/app/(authenticated)/.DS_Store
./src/app/(authenticated)/admin/codici-sconto/page.tsx
./src/app/(authenticated)/admin/listino/page.tsx
./src/app/(authenticated)/admin/utenti/page.tsx
./src/app/(authenticated)/layout.tsx
./src/app/(authenticated)/preventivi/[id]/page.tsx
./src/app/(authenticated)/preventivi/nuovo/page.tsx
./src/app/(authenticated)/preventivi/page.tsx
./src/app/.DS_Store
./src/app/api/auth/[...nextauth]/route.ts
./src/app/api/discount-codes/[id]/route.ts
./src/app/api/discount-codes/route.ts
./src/app/api/discount-codes/validate/route.ts
./src/app/api/products/[id]/route.ts
./src/app/api/products/route.ts
./src/app/api/quotes/[id]/route.ts
./src/app/api/quotes/create/route.ts
./src/app/api/quotes/route.ts
./src/app/api/users/[id]/route.ts
./src/app/api/users/route.ts
./src/app/globals.css
./src/app/layout.tsx
./src/app/login/page.tsx
./src/app/page.tsx
./src/app/providers.tsx
./src/components/Navbar.tsx
./src/lib/auth.ts
./src/lib/discounts.ts
./src/lib/prisma.ts
./src/middleware.ts
./src/types/next-auth.d.ts
./tailwind.config.ts
./tsconfig.json
./tsconfig.tsbuildinfo
```

## File: package.json

```json
{
  "name": "preventivatore-metodo-cantiere",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "postinstall": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "setup": "npm install && prisma db push && npm run db:seed"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "next-auth": "^4.24.7",
    "bcryptjs": "^2.4.3",
    "@prisma/client": "^5.19.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.5.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "prisma": "^5.19.0",
    "tsx": "^4.16.0"
  }
}
```

## File: prisma/schema.prisma

```prisma
// Schema Prisma per Preventivatore Metodo Cantiere
// Documentazione: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  // SQLite per sviluppo locale - nessuna installazione richiesta
  // In produzione su Vercel si usa Postgres: cambiare provider a "postgresql"
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      String   @default("commerciale") // "admin" o "commerciale"
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  quotes    Quote[]
}

model Product {
  id          String   @id @default(cuid())
  code        String   @unique // es. "m0101", "AUDIT_LAMPO"
  name        String
  block       String // "FRONTEND", "01", "02", "03", "04", "06", "07", "MEGABUNDLE", "CANONI_CRM", "CANONI_AIVOCALE", "CANONI_WA", "ADS_GESTITE", "DCE"
  type        String // "product", "variant", "bundle", "canone"
  positioning String // frase di posizionamento (1 riga)
  includes    String // JSON array di stringhe (cosa include)
  objection   String? // obiezione attesa
  response    String? // risposta all'obiezione
  price       Int // prezzo in euro interi
  priceLabel  String? // per casi speciali come "€2.497 + €1.500" (reclutamento)
  isMonthly   Boolean  @default(false) // canone mensile
  isRecurring Boolean  @default(false) // servizio ricorrente calcolato
  prerequisites String? // JSON array di codici prodotto richiesti (es. AI Inbound richiede AI Base o Personalizzato)
  bundleItems String? // JSON array di codici prodotto se è bundle
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Quote {
  id              String      @id @default(cuid())
  quoteNumber     String      @unique // numero leggibile tipo "Q2026-0001"
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  
  // Dati cliente
  clientName      String
  clientCompany   String?
  clientEmail     String?
  clientPhone     String?
  clientNotes     String?
  crmCustomerId   String? // id nel CRM Metodo Cantiere (per sincronizzazione futura)
  
  // Dati fiscali per fatturazione
  clientVat       String? // Partita IVA
  clientSdi       String? // Codice univoco SDI
  
  // Totali (importi finali, dopo sconti)
  totalSetup      Int // totale setup una tantum in euro (DOPO sconto)
  totalMonthly    Int // totale canoni mensili in euro
  totalAnnual     Int // totale canoni annuali (con sconto 20% CRM applicato SOLO ai canoni CRM)
  
  // Dati sconto (per audit e visualizzazione nel dettaglio)
  setupBeforeDiscount Int @default(0) // setup PRIMA dello sconto applicato
  discountType    String? // "volume_5", "volume_10", "manual", "voucher_audit", null
  discountAmount  Int     @default(0) // importo dello sconto in euro
  discountCode    String? // codice manuale inserito (es. "AMICO-15")
  discountPercent Int     @default(0) // percentuale sconto applicata
  scontoCrmAnnuale Boolean @default(true) // se applicato sconto 20% pagamento annuale CRM
  
  // Voucher Audit Lampo
  voucherAuditApplied Boolean @default(false) // se applicato il voucher €147 dell'Audit Lampo
  
  // Stato preventivo
  status          String   @default("pending") // pending, inviato, accettato, rifiutato, scaduto
  expiresAt       DateTime
  
  // Note commerciali
  notes           String?
  
  // Relazioni
  items           QuoteItem[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model QuoteItem {
  id          String   @id @default(cuid())
  quoteId     String
  quote       Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  
  productCode String // code del prodotto selezionato
  productName String // snapshot del nome al momento della selezione
  price       Int // snapshot del prezzo al momento della selezione
  quantity    Int      @default(1)
  isMonthly   Boolean  @default(false)
  notes       String?
  
  createdAt   DateTime @default(now())
}

// Codici sconto manuali (gestiti da admin)
// Esempi: "AMICO-15", "BLACKFRIDAY-20", "VIP-10"
model DiscountCode {
  id              String   @id @default(cuid())
  code            String   @unique // es. "AMICO-15"
  description     String?  // a cosa serve
  discountPercent Int      // percentuale sconto (es. 15 per -15%)
  maxUses         Int?     // se null = illimitato
  usedCount       Int      @default(0)
  expiresAt       DateTime? // se null = non scade
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## File: src/app/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --mc-orange: #FF6A00;
  --mc-black: #1A1A1A;
  --mc-dark: #212121;
  --mc-muted: #706E65;
  --mc-beige: #FAF8F4;
  --mc-border: #E5DFD0;
}

* {
  box-sizing: border-box;
}

html, body {
  padding: 0;
  margin: 0;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--mc-black);
  background: var(--mc-beige);
}

h1, h2, h3 {
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  color: var(--mc-black);
}

.btn-primary {
  @apply inline-flex items-center justify-center px-6 py-3 bg-mc-orange text-white font-semibold rounded-md hover:bg-mc-orange-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply inline-flex items-center justify-center px-6 py-3 bg-white border-2 border-mc-border text-mc-black font-semibold rounded-md hover:border-mc-orange transition-colors;
}

.btn-danger {
  @apply inline-flex items-center justify-center px-4 py-2 bg-mc-red text-white font-semibold rounded-md hover:opacity-90 transition-opacity text-sm;
}

.card {
  @apply bg-white rounded-lg border border-mc-border;
}

.input {
  @apply w-full px-4 py-2 border border-mc-border rounded-md focus:outline-none focus:border-mc-orange focus:ring-1 focus:ring-mc-orange bg-white;
}

.label {
  @apply block text-sm font-semibold text-mc-black mb-1;
}

.badge {
  @apply inline-flex items-center px-2 py-1 text-xs font-semibold rounded;
}

.badge-pending {
  @apply bg-amber-100 text-amber-800;
}

.badge-sent {
  @apply bg-blue-100 text-blue-800;
}

.badge-accepted {
  @apply bg-green-100 text-green-800;
}

.badge-rejected {
  @apply bg-red-100 text-red-800;
}

.badge-expired {
  @apply bg-gray-100 text-gray-600;
}
```

## File: src/app/layout.tsx

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Preventivatore Metodo Cantiere",
  description: "Strumento interno per la composizione di preventivi Metodo Cantiere",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## File: tailwind.config.ts (o .js)

```tsx
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mc: {
          orange: "#FF6A00",
          "orange-dark": "#E55F00",
          "orange-light": "#FF8530",
          black: "#1A1A1A",
          dark: "#212121",
          charcoal: "#2B2B2B",
          muted: "#706E65",
          beige: "#FAF8F4",
          "beige-warm": "#F5F1E8",
          border: "#E5DFD0",
          green: "#2D7A4F",
          red: "#C73E3A",
          amber: "#B07800",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        serif: ["'Playfair Display'", "Georgia", "serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
```

## Componenti in src/components/

### src/components/Navbar.tsx

```tsx
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "admin";

  const navItems = [
    { href: "/preventivi", label: "I miei preventivi" },
    { href: "/preventivi/nuovo", label: "Nuovo preventivo" },
    ...(isAdmin
      ? [
          { href: "/admin/listino", label: "Gestione listino" },
          { href: "/admin/codici-sconto", label: "Codici sconto" },
          { href: "/admin/utenti", label: "Utenti" },
        ]
      : []),
  ];

  return (
    <nav className="bg-mc-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/preventivi" className="flex items-center gap-3">
          <span className="text-mc-orange font-bold uppercase tracking-wider text-sm">
            Metodo Cantiere®
          </span>
          <span className="text-sm italic text-mc-muted hidden md:inline">Preventivatore</span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 md:gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm px-3 py-2 rounded transition-colors ${
                  pathname === item.href || (item.href !== "/preventivi" && pathname?.startsWith(item.href))
                    ? "bg-mc-orange text-white"
                    : "hover:text-mc-orange"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-white/20">
            <span className="text-sm text-white/70 hidden md:inline">{session?.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-white/70 hover:text-white"
            >
              Esci
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

## Pagine principali

### src/app/login/page.tsx

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email o password non corretti");
    } else {
      router.push("/preventivi");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-mc-orange font-bold uppercase tracking-wider text-sm mb-2">Metodo Cantiere®</p>
          <h1 className="text-4xl">Preventivatore</h1>
          <p className="text-mc-muted italic mt-2">Strumento interno commerciale</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-mc-red text-mc-red px-4 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-mc-muted mt-6">
          Accesso riservato al team Metodo Cantiere
        </p>
      </div>
    </div>
  );
}
```

### src/app/(authenticated)/preventivi/page.tsx

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Quote = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany: string | null;
  totalSetup: number;
  totalMonthly: number;
  totalAnnual: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  user: { name: string };
  items: { id: string }[];
};

const statusLabels: Record<string, { label: string; class: string }> = {
  pending: { label: "In attesa", class: "badge-pending" },
  inviato: { label: "Inviato", class: "badge-sent" },
  accettato: { label: "Accettato", class: "badge-accepted" },
  rifiutato: { label: "Rifiutato", class: "badge-rejected" },
  scaduto: { label: "Scaduto", class: "badge-expired" },
};

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function PreventiviPage() {
  const { data: session } = useSession();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, [filter]);

  async function fetchQuotes() {
    setLoading(true);
    const url = filter === "all" ? "/api/quotes" : `/api/quotes?status=${filter}`;
    const res = await fetch(url);
    const data = await res.json();
    setQuotes(data);
    setLoading(false);
  }

  // Stats
  const stats = {
    total: quotes.length,
    pending: quotes.filter((q) => q.status === "pending").length,
    accettati: quotes.filter((q) => q.status === "accettato").length,
    valoreTotale: quotes.reduce((sum, q) => sum + q.totalSetup, 0),
    valoreAcquisito: quotes
      .filter((q) => q.status === "accettato")
      .reduce((sum, q) => sum + q.totalSetup, 0),
    inScadenza: quotes.filter(
      (q) =>
        (q.status === "pending" || q.status === "inviato") &&
        daysUntil(q.expiresAt) <= 7 &&
        daysUntil(q.expiresAt) >= 0
    ).length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl mb-1">I miei preventivi</h1>
          <p className="text-mc-muted italic">
            {session?.user?.role === "admin"
              ? "Visualizzazione admin: tutti i preventivi di tutti i commerciali"
              : "I preventivi che hai creato"}
          </p>
        </div>
        <Link href="/preventivi/nuovo" className="btn-primary">
          + Nuovo preventivo
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-sm text-mc-muted uppercase tracking-wider font-semibold">Totale</div>
          <div className="text-3xl font-bold mt-1">{stats.total}</div>
          <div className="text-xs text-mc-muted mt-1">preventivi</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-mc-muted uppercase tracking-wider font-semibold">In attesa</div>
          <div className="text-3xl font-bold mt-1">{stats.pending}</div>
          <div className="text-xs text-mc-muted mt-1">da seguire</div>
        </div>
        <div className="card p-4 border-mc-orange">
          <div className="text-sm text-mc-orange uppercase tracking-wider font-semibold">In scadenza</div>
          <div className="text-3xl font-bold mt-1 text-mc-orange">{stats.inScadenza}</div>
          <div className="text-xs text-mc-muted mt-1">entro 7 giorni</div>
        </div>
        <div className="card p-4 bg-green-50 border-mc-green">
          <div className="text-sm text-mc-green uppercase tracking-wider font-semibold">Acquisito</div>
          <div className="text-2xl font-bold mt-1 text-mc-green">{formatEuro(stats.valoreAcquisito)}</div>
          <div className="text-xs text-mc-muted mt-1">{stats.accettati} accettati</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-mc-muted">Filtra:</span>
        {[
          { value: "all", label: "Tutti" },
          { value: "pending", label: "In attesa" },
          { value: "inviato", label: "Inviati" },
          { value: "accettato", label: "Accettati" },
          { value: "rifiutato", label: "Rifiutati" },
          { value: "scaduto", label: "Scaduti" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              filter === f.value
                ? "bg-mc-black text-white"
                : "bg-white border border-mc-border hover:border-mc-orange"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista preventivi */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-mc-muted">Caricamento...</div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-mc-muted italic mb-4">Nessun preventivo trovato.</p>
            <Link href="/preventivi/nuovo" className="btn-primary">
              Crea il primo preventivo
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-mc-beige-warm">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold">Numero</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Cliente</th>
                {session?.user?.role === "admin" && (
                  <th className="text-left px-4 py-3 text-sm font-semibold">Commerciale</th>
                )}
                <th className="text-left px-4 py-3 text-sm font-semibold">Data creazione</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Scadenza</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Setup</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Canoni/mese</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Stato</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const days = daysUntil(q.expiresAt);
                const isExpiring = (q.status === "pending" || q.status === "inviato") && days <= 7 && days >= 0;
                return (
                  <tr
                    key={q.id}
                    className="border-t border-mc-border hover:bg-mc-beige-warm transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-sm">
                      <Link href={`/preventivi/${q.id}`} className="text-mc-orange hover:underline">
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{q.clientName}</div>
                      {q.clientCompany && (
                        <div className="text-xs text-mc-muted">{q.clientCompany}</div>
                      )}
                    </td>
                    {session?.user?.role === "admin" && (
                      <td className="px-4 py-3 text-sm">{q.user.name}</td>
                    )}
                    <td className="px-4 py-3 text-sm">{formatDate(q.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>{formatDate(q.expiresAt)}</div>
                      {isExpiring && (
                        <div className="text-xs text-mc-orange font-semibold">
                          {days === 0 ? "scade oggi" : `tra ${days} gg`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatEuro(q.totalSetup)}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      {q.totalMonthly > 0 ? formatEuro(q.totalMonthly) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusLabels[q.status]?.class || "badge-pending"}`}>
                        {statusLabels[q.status]?.label || q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/preventivi/${q.id}`} className="text-mc-orange hover:underline text-sm">
                        →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

### src/app/(authenticated)/preventivi/nuovo/page.tsx

```tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  calcolaScontoVolume,
  rilevaBundleSuggeriti,
  applicaCodiceManuale,
  calcolaTotali,
  formatEuro,
  type Product,
  type SelectedItem,
  type DiscountResult,
} from "@/lib/discounts";

const blockLabels: Record<string, string> = {
  FRONTEND: "Front-end",
  "01": "Blocco 01 — Posizionamento",
  "02": "Blocco 02 — Tecnologia CRM",
  "03": "Blocco 03 — Acquisizione",
  "04": "Blocco 04 — Automazioni",
  "06": "Blocco 06 — Direzione e Coaching",
  "07": "Blocco 07 — Consulenza Nicola Busca",
  MEGABUNDLE: "Mega-bundle",
  CANONI_CRM: "Canoni CRM (mensili)",
  CANONI_AIVOCALE: "Canoni AI Vocale (mensili)",
  CANONI_WA: "Canoni WhatsApp (mensili)",
  ADS_GESTITE: "ADS Gestite (mensili)",
  DCE: "Direzione Commerciale Esterna (mensili)",
};

const blockOrder = [
  "FRONTEND",
  "01",
  "02",
  "03",
  "04",
  "06",
  "07",
  "MEGABUNDLE",
  "CANONI_CRM",
  "CANONI_AIVOCALE",
  "CANONI_WA",
  "ADS_GESTITE",
  "DCE",
];

type ProductFull = Product & {
  positioning: string;
  includes: string;
  objection: string | null;
  response: string | null;
  priceLabel: string | null;
  prerequisites: string | null;
};

export default function NuovoPreventivoPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Dati cliente base
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  // Dati fiscali
  const [showFiscal, setShowFiscal] = useState(false);
  const [clientVat, setClientVat] = useState("");
  const [clientSdi, setClientSdi] = useState("");

  // Selezione voci
  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [scontoCrmAnnuale, setScontoCrmAnnuale] = useState(true);

  // Codice sconto manuale
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedManualDiscount, setAppliedManualDiscount] = useState<{
    code: string;
    percent: number;
  } | null>(null);
  const [discountValidating, setDiscountValidating] = useState(false);
  const [discountError, setDiscountError] = useState("");

  // Note e scadenza
  const [notes, setNotes] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);

  // UI state
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(
    new Set(["FRONTEND", "01", "02"])
  );
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      });
  }, []);

  function toggleProduct(code: string) {
    const newSelected = new Map(selected);
    if (newSelected.has(code)) newSelected.delete(code);
    else newSelected.set(code, 1);
    setSelected(newSelected);
  }

  function updateQuantity(code: string, qty: number) {
    const newSelected = new Map(selected);
    if (qty <= 0) newSelected.delete(code);
    else newSelected.set(code, qty);
    setSelected(newSelected);
  }

  function toggleBlock(block: string) {
    const newSet = new Set(expandedBlocks);
    if (newSet.has(block)) newSet.delete(block);
    else newSet.add(block);
    setExpandedBlocks(newSet);
  }

  function toggleDetails(code: string) {
    const newSet = new Set(expandedDetails);
    if (newSet.has(code)) newSet.delete(code);
    else newSet.add(code);
    setExpandedDetails(newSet);
  }

  // Costruisce array SelectedItem (formato per la libreria sconti)
  const selectedItems: SelectedItem[] = useMemo(() => {
    const items: SelectedItem[] = [];
    for (const [code, qty] of selected.entries()) {
      const p = products.find((pr) => pr.code === code);
      if (!p) continue;
      items.push({ code, qty, price: p.price, isMonthly: p.isMonthly, block: p.block });
    }
    return items;
  }, [selected, products]);

  // Calcolo sconto VOLUME (automatico) — applicato solo se NON c'è codice manuale
  const scontoVolume = useMemo(() => calcolaScontoVolume(selectedItems), [selectedItems]);

  // Sconto FINALE applicato (manuale ha priorità su volume)
  const discountApplied: DiscountResult = useMemo(() => {
    const setupTotal = selectedItems
      .filter((i) => !i.isMonthly)
      .reduce((sum, i) => sum + i.price * i.qty, 0);

    if (appliedManualDiscount) {
      return applicaCodiceManuale(
        setupTotal,
        appliedManualDiscount.percent,
        appliedManualDiscount.code
      );
    }
    return scontoVolume;
  }, [appliedManualDiscount, scontoVolume, selectedItems]);

  // Voucher Audit Lampo: si applica AUTOMATICAMENTE se l'utente ha selezionato
  // sia AUDIT_LAMPO che DIAGNOSI_STRATEGICA → scala i €147 della Diagnosi
  const voucherAuditApplicato = useMemo(() => {
    return selected.has("AUDIT_LAMPO") && selected.has("DIAGNOSI_STRATEGICA");
  }, [selected]);

  // Bundle suggeriti (l'utente ha composto tutti i moduli di un bundle)
  const bundleSuggeriti = useMemo(
    () => rilevaBundleSuggeriti(selectedItems, products),
    [selectedItems, products]
  );

  // Totali calcolati
  const totals = useMemo(
    () => calcolaTotali(selectedItems, discountApplied, scontoCrmAnnuale, voucherAuditApplicato),
    [selectedItems, discountApplied, scontoCrmAnnuale, voucherAuditApplicato]
  );

  // Raggruppa prodotti per blocco
  const productsByBlock = useMemo(() => {
    const map = new Map<string, ProductFull[]>();
    for (const block of blockOrder) map.set(block, []);
    for (const p of products) {
      const list = map.get(p.block) || [];
      list.push(p);
      map.set(p.block, list);
    }
    return map;
  }, [products]);

  async function applicaCodice() {
    setDiscountError("");
    if (!discountCodeInput.trim()) return;
    setDiscountValidating(true);
    const res = await fetch("/api/discount-codes/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: discountCodeInput.trim() }),
    });
    const data = await res.json();
    setDiscountValidating(false);
    if (data.valid) {
      setAppliedManualDiscount({ code: data.code, percent: data.discountPercent });
      setDiscountCodeInput("");
    } else {
      setDiscountError(data.error || "Codice non valido");
    }
  }

  function rimuoviCodiceManuale() {
    setAppliedManualDiscount(null);
    setDiscountError("");
  }

  // Sostituisce moduli singoli con bundle
  function applicaBundle(bundleCode: string, itemsToReplace: string[]) {
    const newSelected = new Map(selected);
    for (const code of itemsToReplace) newSelected.delete(code);
    newSelected.set(bundleCode, 1);
    setSelected(newSelected);
  }

  async function handleSubmit() {
    if (!clientName.trim()) {
      setError("Il nome del cliente è obbligatorio");
      return;
    }
    if (selected.size === 0) {
      setError("Seleziona almeno una voce");
      return;
    }

    setError("");
    setSaving(true);

    const items = Array.from(selected.entries()).map(([code, quantity]) => {
      const p = products.find((pr) => pr.code === code)!;
      return {
        productCode: code,
        productName: p.name,
        price: p.price,
        quantity,
        isMonthly: p.isMonthly,
      };
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const res = await fetch("/api/quotes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName,
        clientCompany: clientCompany || null,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        clientNotes: clientNotes || null,
        clientVat: clientVat || null,
        clientSdi: clientSdi || null,
        items,
        notes: notes || null,
        expiresAt,
        totalSetup: totals.setupAfterDiscount,
        totalMonthly: totals.monthlyTotal,
        totalAnnual: totals.annualTotal,
        setupBeforeDiscount: totals.setupBeforeDiscount,
        discountType: discountApplied.type === "none" ? null : discountApplied.type,
        discountAmount: discountApplied.amount,
        discountCode: appliedManualDiscount?.code || null,
        discountPercent: discountApplied.percent,
        scontoCrmAnnuale,
        voucherAuditApplied: voucherAuditApplicato,
      }),
    });

    setSaving(false);

    if (res.ok) {
      const quote = await res.json();
      router.push(`/preventivi/${quote.id}`);
    } else {
      const data = await res.json();
      setError(data.error || "Errore nel salvataggio");
    }
  }

  if (loading) return <div className="text-center py-12 text-mc-muted">Caricamento listino...</div>;

  return (
    <div>
      <h1 className="text-4xl mb-1">Nuovo preventivo</h1>
      <p className="text-mc-muted italic mb-8">
        Componi il preventivo durante la call con il cliente. Il totale si aggiorna in tempo reale.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna sinistra - composizione */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dati cliente */}
          <div className="card p-6">
            <h2 className="text-2xl mb-4">Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Nome *</label>
                <input
                  type="text"
                  className="input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Mario Rossi"
                />
              </div>
              <div>
                <label className="label">Ragione sociale / Azienda</label>
                <input
                  type="text"
                  className="input"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="Edilizia Rossi Srl"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="mario@esempio.it"
                />
              </div>
              <div>
                <label className="label">Telefono</label>
                <input
                  type="tel"
                  className="input"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+39 333 1234567"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Note cliente</label>
                <textarea
                  className="input"
                  rows={2}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Contesto, esigenze emerse in call, riferimenti..."
                />
              </div>
            </div>

            {/* Sezione fiscale espandibile */}
            <div className="mt-4 pt-4 border-t border-mc-border">
              <button
                type="button"
                onClick={() => setShowFiscal(!showFiscal)}
                className="text-sm text-mc-orange hover:underline flex items-center gap-2"
              >
                <span>{showFiscal ? "−" : "+"}</span>
                Dati di fatturazione (P.IVA, codice SDI)
              </button>
              {showFiscal && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="label">Partita IVA</label>
                    <input
                      type="text"
                      className="input"
                      value={clientVat}
                      onChange={(e) => setClientVat(e.target.value)}
                      placeholder="IT12345678901"
                      maxLength={13}
                    />
                  </div>
                  <div>
                    <label className="label">Codice univoco SDI</label>
                    <input
                      type="text"
                      className="input"
                      value={clientSdi}
                      onChange={(e) => setClientSdi(e.target.value.toUpperCase())}
                      placeholder="0000000 (7 caratteri)"
                      maxLength={7}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Suggerimento bundle (se composti tutti i moduli di un bundle) */}
          {bundleSuggeriti.length > 0 && (
            <div className="card p-4 bg-green-50 border-mc-green">
              <h3 className="text-sm font-semibold text-mc-green uppercase tracking-wider mb-2">
                💡 Suggerimento bundle disponibile
              </h3>
              {bundleSuggeriti.map((s) => (
                <div
                  key={s.bundleCode}
                  className="flex items-center justify-between gap-4 py-2 border-t border-green-200 first:border-0"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{s.bundleName}</div>
                    <div className="text-xs text-mc-muted">
                      Hai selezionato tutti i moduli singoli ({formatEuro(s.currentSum)}). Sostituisci col bundle a{" "}
                      <span className="font-semibold text-mc-green">{formatEuro(s.bundlePrice)}</span> e risparmi{" "}
                      <span className="font-semibold text-mc-green">{formatEuro(s.savings)}</span>.
                    </div>
                  </div>
                  <button
                    onClick={() => applicaBundle(s.bundleCode, s.itemsToReplace)}
                    className="btn-primary text-sm whitespace-nowrap"
                  >
                    Usa bundle
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Listino */}
          <div className="card p-6">
            <h2 className="text-2xl mb-4">Componi l&apos;offerta</h2>

            <div className="space-y-3">
              {blockOrder.map((block) => {
                const blockProducts = productsByBlock.get(block) || [];
                if (blockProducts.length === 0) return null;
                const isExpanded = expandedBlocks.has(block);
                const selectedInBlock = blockProducts.filter((p) => selected.has(p.code)).length;

                return (
                  <div key={block} className="border border-mc-border rounded overflow-hidden">
                    <button
                      onClick={() => toggleBlock(block)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-mc-beige-warm hover:bg-mc-border transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{isExpanded ? "−" : "+"}</span>
                        <span className="font-semibold">{blockLabels[block]}</span>
                        {selectedInBlock > 0 && (
                          <span className="badge bg-mc-orange text-white">{selectedInBlock}</span>
                        )}
                      </div>
                      <span className="text-xs text-mc-muted">{blockProducts.length} voci</span>
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-mc-border">
                        {blockProducts.map((p) => {
                          const isSelected = selected.has(p.code);
                          const qty = selected.get(p.code) || 0;
                          const showDetails = expandedDetails.has(p.code);
                          const includesArr = JSON.parse(p.includes) as string[];

                          return (
                            <div
                              key={p.id}
                              className={`p-4 transition-colors ${
                                isSelected ? "bg-orange-50" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleProduct(p.code)}
                                  className="mt-1 h-5 w-5 accent-mc-orange cursor-pointer"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="font-semibold">{p.name}</div>
                                      <div className="text-sm text-mc-muted italic mt-0.5">
                                        {p.positioning}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="font-bold text-lg text-mc-orange">
                                        {p.priceLabel || formatEuro(p.price)}
                                        {p.isMonthly && (
                                          <span className="text-xs font-normal">/mese</span>
                                        )}
                                      </div>
                                      {p.type === "bundle" && (
                                        <div className="text-xs text-mc-green font-semibold">
                                          BUNDLE
                                        </div>
                                      )}
                                      {p.type === "variant" && (
                                        <div className="text-xs text-blue-600 font-semibold">
                                          VARIANTE
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => toggleDetails(p.code)}
                                    className="text-xs text-mc-orange hover:underline mt-2"
                                  >
                                    {showDetails ? "Nascondi dettagli" : "Mostra dettagli"}
                                  </button>

                                  {showDetails && (
                                    <div className="mt-3 p-3 bg-white rounded border border-mc-border text-sm space-y-2">
                                      <div>
                                        <div className="font-semibold text-mc-orange text-xs uppercase tracking-wider">
                                          Cosa include
                                        </div>
                                        <ul className="mt-1 space-y-1">
                                          {includesArr.map((item, i) => (
                                            <li key={i} className="flex gap-2">
                                              <span className="text-mc-orange">•</span>
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      {p.objection && p.response && (
                                        <div className="mt-3 p-3 bg-red-50 border-l-4 border-mc-red rounded">
                                          <div className="font-semibold text-mc-red text-xs uppercase tracking-wider">
                                            Obiezione + Risposta
                                          </div>
                                          <div className="italic mt-1">&quot;{p.objection}&quot;</div>
                                          <div className="mt-1">
                                            <span className="font-semibold">Risposta:</span> {p.response}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {isSelected && p.isMonthly && (
                                    <div className="mt-2 flex items-center gap-2 text-sm">
                                      <span className="text-mc-muted">Mesi:</span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={qty}
                                        onChange={(e) =>
                                          updateQuantity(p.code, parseInt(e.target.value) || 1)
                                        }
                                        className="w-20 px-2 py-1 border border-mc-border rounded text-sm"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note e scadenza */}
          <div className="card p-6">
            <h2 className="text-2xl mb-4">Scadenza e note</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Validità preventivo (giorni)</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 30)}
                />
                <p className="text-xs text-mc-muted mt-1">
                  Scadenza:{" "}
                  {new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toLocaleDateString(
                    "it-IT"
                  )}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Note interne (non visibili al cliente)</label>
              <textarea
                className="input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note operative, promemoria follow-up, condizioni speciali..."
              />
            </div>
          </div>
        </div>

        {/* Colonna destra - riepilogo sticky */}
        <div className="lg:col-span-1">
          <div className="card p-6 lg:sticky lg:top-4">
            <h2 className="text-2xl mb-4">Riepilogo</h2>

            {selected.size === 0 ? (
              <p className="text-mc-muted italic text-sm">Seleziona le voci dal listino.</p>
            ) : (
              <>
                <div className="space-y-1 mb-4 max-h-60 overflow-y-auto pr-2">
                  {Array.from(selected.entries()).map(([code, qty]) => {
                    const p = products.find((pr) => pr.code === code);
                    if (!p) return null;
                    return (
                      <div key={code} className="flex justify-between text-sm py-1 gap-2">
                        <span className="flex-1 pr-2">
                          {p.name}
                          {p.isMonthly && qty > 1 && (
                            <span className="text-mc-muted"> × {qty} mesi</span>
                          )}
                        </span>
                        <span className="font-semibold shrink-0">
                          {p.priceLabel ||
                            formatEuro(p.isMonthly ? p.price : p.price * qty) +
                              (p.isMonthly ? "/m" : "")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-mc-border pt-3 space-y-2 text-sm">
                  {/* Setup */}
                  <div className="flex justify-between">
                    <span>Setup una tantum</span>
                    <span className="font-semibold">
                      {formatEuro(totals.setupBeforeDiscount)}
                    </span>
                  </div>

                  {/* Sconto applicato */}
                  {discountApplied.amount > 0 && (
                    <div className="flex justify-between text-mc-green">
                      <span className="text-xs">{discountApplied.label}</span>
                      <span className="font-semibold text-xs">
                        -{formatEuro(discountApplied.amount)}
                      </span>
                    </div>
                  )}

                  {/* Voucher Audit */}
                  {voucherAuditApplicato && (
                    <div className="flex justify-between text-mc-green">
                      <span className="text-xs">Voucher Audit Lampo</span>
                      <span className="font-semibold text-xs">-{formatEuro(147)}</span>
                    </div>
                  )}

                  {(discountApplied.amount > 0 || voucherAuditApplicato) && (
                    <div className="flex justify-between font-semibold pt-1 border-t border-mc-border">
                      <span>Setup finale</span>
                      <span>{formatEuro(totals.setupAfterDiscount)}</span>
                    </div>
                  )}

                  {/* Canoni */}
                  {totals.monthlyTotal > 0 && (
                    <div className="flex justify-between pt-2 border-t border-mc-border">
                      <span>Canoni mensili totali</span>
                      <span className="font-semibold">{formatEuro(totals.monthlyTotal)}/mese</span>
                    </div>
                  )}

                  {/* Sconto annuale CRM */}
                  {totals.monthlyCrm > 0 && (
                    <div className="pt-2 border-t border-mc-border">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scontoCrmAnnuale}
                          onChange={(e) => setScontoCrmAnnuale(e.target.checked)}
                          className="mt-0.5 accent-mc-orange"
                        />
                        <div className="flex-1">
                          <div className="text-xs font-semibold">
                            Pagamento annuale anticipato canoni CRM
                          </div>
                          <div className="text-xs text-mc-muted">
                            Sconto 20% sui canoni CRM ({formatEuro(totals.monthlyCrm)}/mese).
                            Risparmio: {formatEuro(scontoCrmAnnuale ? totals.scontoCrmAnnuale : 0)}/anno
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* Codice sconto manuale */}
                <div className="mt-4 pt-3 border-t border-mc-border">
                  <label className="text-xs font-semibold uppercase tracking-wider text-mc-muted">
                    Codice sconto
                  </label>
                  {appliedManualDiscount ? (
                    <div className="mt-2 flex items-center justify-between gap-2 p-2 bg-green-50 rounded text-sm">
                      <div>
                        <div className="font-mono font-semibold">{appliedManualDiscount.code}</div>
                        <div className="text-xs text-mc-green">
                          -{appliedManualDiscount.percent}% sostituisce sconto volume
                        </div>
                      </div>
                      <button
                        onClick={rimuoviCodiceManuale}
                        className="text-mc-red text-xs hover:underline"
                      >
                        Rimuovi
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="es. AMICO-15"
                          value={discountCodeInput}
                          onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                          className="input text-sm flex-1"
                          onKeyDown={(e) => e.key === "Enter" && applicaCodice()}
                        />
                        <button
                          onClick={applicaCodice}
                          disabled={discountValidating || !discountCodeInput.trim()}
                          className="btn-secondary text-sm px-3 py-1"
                        >
                          {discountValidating ? "..." : "Applica"}
                        </button>
                      </div>
                      {discountError && (
                        <div className="text-xs text-mc-red mt-1">{discountError}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Totale finale */}
                <div className="border-t-2 border-mc-black pt-4 mt-4">
                  <div className="text-xs text-mc-muted uppercase tracking-wider font-semibold">
                    Totale primo anno
                  </div>
                  <div className="text-3xl font-bold text-mc-orange">
                    {formatEuro(totals.annualTotal)}
                  </div>
                  <div className="text-xs text-mc-muted mt-1">IVA esclusa</div>
                </div>
              </>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-mc-red text-mc-red px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving || selected.size === 0}
              className="btn-primary w-full mt-4"
            >
              {saving ? "Salvataggio..." : "Salva preventivo"}
            </button>

            <p className="text-xs text-mc-muted mt-3 text-center">
              PDF e email cliente arrivano negli step successivi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### src/app/(authenticated)/preventivi/[id]/page.tsx

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type QuoteDetail = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientNotes: string | null;
  clientVat: string | null;
  clientSdi: string | null;
  notes: string | null;
  totalSetup: number;
  totalMonthly: number;
  totalAnnual: number;
  setupBeforeDiscount: number;
  discountType: string | null;
  discountAmount: number;
  discountCode: string | null;
  discountPercent: number;
  scontoCrmAnnuale: boolean;
  voucherAuditApplied: boolean;
  status: string;
  expiresAt: string;
  createdAt: string;
  user: { name: string; email: string };
  items: {
    id: string;
    productCode: string;
    productName: string;
    price: number;
    quantity: number;
    isMonthly: boolean;
  }[];
};

const statusOptions = [
  { value: "pending", label: "In attesa", class: "badge-pending" },
  { value: "inviato", label: "Inviato al cliente", class: "badge-sent" },
  { value: "accettato", label: "Accettato", class: "badge-accepted" },
  { value: "rifiutato", label: "Rifiutato", class: "badge-rejected" },
  { value: "scaduto", label: "Scaduto", class: "badge-expired" },
];

const discountTypeLabels: Record<string, string> = {
  volume_5: "Sconto volume 5% (3+ moduli)",
  volume_10: "Sconto volume 10% (5+ moduli)",
  manual: "Codice sconto manuale",
};

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function DettaglioPreventivoPage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/quotes/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setQuote(data);
        setLoading(false);
      });
  }, [params.id]);

  async function updateStatus(newStatus: string) {
    if (!quote) return;
    setUpdating(true);
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setQuote({ ...quote, status: updated.status });
    }
    setUpdating(false);
  }

  async function handleDelete() {
    if (!quote) return;
    if (!confirm("Sei sicuro di voler cancellare questo preventivo?")) return;
    const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
    if (res.ok) router.push("/preventivi");
  }

  if (loading) return <div className="text-center py-12 text-mc-muted">Caricamento...</div>;
  if (!quote) return <div className="text-center py-12 text-mc-red">Preventivo non trovato</div>;

  const setupItems = quote.items.filter((i) => !i.isMonthly);
  const monthlyItems = quote.items.filter((i) => i.isMonthly);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/preventivi" className="text-sm text-mc-muted hover:text-mc-orange mb-2 inline-block">
            ← Torna all&apos;elenco
          </Link>
          <h1 className="text-4xl mb-1">
            Preventivo <span className="font-mono text-mc-orange">{quote.quoteNumber}</span>
          </h1>
          <p className="text-mc-muted">
            Creato il {formatDate(quote.createdAt)} da {quote.user.name}
          </p>
        </div>
        <button onClick={handleDelete} className="btn-danger">
          Elimina
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente */}
          <div className="card p-6">
            <h2 className="text-2xl mb-4">Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-mc-muted text-xs uppercase tracking-wider">Nome</div>
                <div className="font-semibold">{quote.clientName}</div>
              </div>
              {quote.clientCompany && (
                <div>
                  <div className="text-mc-muted text-xs uppercase tracking-wider">Azienda</div>
                  <div className="font-semibold">{quote.clientCompany}</div>
                </div>
              )}
              {quote.clientEmail && (
                <div>
                  <div className="text-mc-muted text-xs uppercase tracking-wider">Email</div>
                  <div className="font-semibold">{quote.clientEmail}</div>
                </div>
              )}
              {quote.clientPhone && (
                <div>
                  <div className="text-mc-muted text-xs uppercase tracking-wider">Telefono</div>
                  <div className="font-semibold">{quote.clientPhone}</div>
                </div>
              )}
              {quote.clientVat && (
                <div>
                  <div className="text-mc-muted text-xs uppercase tracking-wider">P.IVA</div>
                  <div className="font-semibold font-mono">{quote.clientVat}</div>
                </div>
              )}
              {quote.clientSdi && (
                <div>
                  <div className="text-mc-muted text-xs uppercase tracking-wider">Codice SDI</div>
                  <div className="font-semibold font-mono">{quote.clientSdi}</div>
                </div>
              )}
            </div>
            {quote.clientNotes && (
              <div className="mt-4 pt-4 border-t border-mc-border">
                <div className="text-mc-muted text-xs uppercase tracking-wider mb-1">Note cliente</div>
                <p className="text-sm whitespace-pre-wrap">{quote.clientNotes}</p>
              </div>
            )}
          </div>

          {/* Voci */}
          <div className="card p-6">
            <h2 className="text-2xl mb-4">Voci selezionate</h2>

            {setupItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-mc-muted uppercase tracking-wider mb-2">
                  Setup una tantum
                </h3>
                <table className="w-full">
                  <tbody className="divide-y divide-mc-border">
                    {setupItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 text-sm">
                          <div className="font-semibold">{item.productName}</div>
                          <div className="text-xs text-mc-muted font-mono">{item.productCode}</div>
                        </td>
                        <td className="py-2 text-right text-sm font-semibold">
                          {formatEuro(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-mc-border">
                      <td className="py-2 text-sm font-semibold">Subtotale setup</td>
                      <td className="py-2 text-right text-sm font-semibold">
                        {formatEuro(quote.setupBeforeDiscount)}
                      </td>
                    </tr>
                    {quote.discountAmount > 0 && (
                      <tr>
                        <td className="py-2 text-sm text-mc-green">
                          {quote.discountType === "manual"
                            ? `Codice "${quote.discountCode}" (-${quote.discountPercent}%)`
                            : discountTypeLabels[quote.discountType || ""]}
                        </td>
                        <td className="py-2 text-right text-sm font-semibold text-mc-green">
                          -{formatEuro(quote.discountAmount)}
                        </td>
                      </tr>
                    )}
                    {quote.voucherAuditApplied && (
                      <tr>
                        <td className="py-2 text-sm text-mc-green">Voucher Audit Lampo</td>
                        <td className="py-2 text-right text-sm font-semibold text-mc-green">
                          -{formatEuro(147)}
                        </td>
                      </tr>
                    )}
                    {(quote.discountAmount > 0 || quote.voucherAuditApplied) && (
                      <tr className="border-t border-mc-border">
                        <td className="py-2 text-sm font-bold">Setup finale</td>
                        <td className="py-2 text-right text-sm font-bold">
                          {formatEuro(quote.totalSetup)}
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            )}

            {monthlyItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-mc-muted uppercase tracking-wider mb-2">
                  Canoni mensili
                </h3>
                <table className="w-full">
                  <tbody className="divide-y divide-mc-border">
                    {monthlyItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 text-sm">
                          <div className="font-semibold">{item.productName}</div>
                          <div className="text-xs text-mc-muted font-mono">{item.productCode}</div>
                        </td>
                        <td className="py-2 text-right text-sm font-semibold">
                          {formatEuro(item.price)}/mese
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {quote.scontoCrmAnnuale && monthlyItems.some((i) => i.productCode.startsWith("CANONE_CRM")) && (
                  <p className="text-xs text-mc-green mt-2">
                    ✓ Sconto 20% pagamento annuale anticipato applicato sui canoni CRM
                  </p>
                )}
              </div>
            )}
          </div>

          {quote.notes && (
            <div className="card p-6">
              <h2 className="text-2xl mb-4">Note interne</h2>
              <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <div className="text-xs text-mc-muted uppercase tracking-wider font-semibold mb-1">
              Setup una tantum
            </div>
            <div className="text-2xl font-bold">{formatEuro(quote.totalSetup)}</div>

            {quote.totalMonthly > 0 && (
              <>
                <div className="text-xs text-mc-muted uppercase tracking-wider font-semibold mt-4 mb-1">
                  Canoni mensili
                </div>
                <div className="text-2xl font-bold">{formatEuro(quote.totalMonthly)}/mese</div>
              </>
            )}

            <div className="border-t-2 border-mc-black pt-4 mt-4">
              <div className="text-xs text-mc-muted uppercase tracking-wider font-semibold">
                Totale primo anno
              </div>
              <div className="text-3xl font-bold text-mc-orange">{formatEuro(quote.totalAnnual)}</div>
              <div className="text-xs text-mc-muted mt-1">IVA esclusa</div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-3">Stato</h3>
            <div className="space-y-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateStatus(opt.value)}
                  disabled={updating || quote.status === opt.value}
                  className={`w-full text-left px-3 py-2 rounded border-2 text-sm transition-colors ${
                    quote.status === opt.value
                      ? "border-mc-orange bg-orange-50 font-semibold"
                      : "border-mc-border hover:border-mc-orange"
                  }`}
                >
                  <span className={`badge ${opt.class} mr-2`}>{opt.label}</span>
                  {quote.status === opt.value && (
                    <span className="text-xs text-mc-orange">(attuale)</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="text-xs text-mc-muted uppercase tracking-wider font-semibold">Scadenza</div>
            <div className="font-semibold">{formatDate(quote.expiresAt)}</div>
          </div>

          <div className="card p-6 bg-mc-beige-warm border-dashed">
            <h3 className="text-sm font-semibold mb-2">Prossimi step</h3>
            <p className="text-xs text-mc-muted">
              Sessione B (prossima): rifacimento grafica completo. Sessione C: PDF + invio email cliente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### src/app/(authenticated)/layout.tsx

```tsx
import { Navbar } from "@/components/Navbar";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </>
  );
}
```

## API Routes

Elenco file `src/app/api/**/route.ts` e metodi HTTP esportati.

- `src/app/api/auth/[...nextauth]/route.ts`: GET, POST
- `src/app/api/discount-codes/route.ts`: GET, POST
- `src/app/api/discount-codes/[id]/route.ts`: PATCH, DELETE
- `src/app/api/discount-codes/validate/route.ts`: POST
- `src/app/api/products/route.ts`: GET, POST
- `src/app/api/products/[id]/route.ts`: PATCH, DELETE
- `src/app/api/quotes/route.ts`: GET
- `src/app/api/quotes/create/route.ts`: POST
- `src/app/api/quotes/[id]/route.ts`: GET, PATCH, DELETE
- `src/app/api/users/route.ts`: GET, POST
- `src/app/api/users/[id]/route.ts`: PATCH, DELETE

## Note tecniche

- **Stack**: Next.js App Router (`src/app`), React 18, TypeScript.
- **Styling**: Tailwind + CSS globale con classi utility custom (`.btn-primary`, `.card`, `.input`, `.badge*`) + palette `mc.*` in Tailwind.
- **Auth**: `next-auth` con `CredentialsProvider`, sessione JWT (8h). Middleware `next-auth/middleware` protegge tutte le route eccetto `/login` e `/api/auth`.
- **DB**: Prisma con SQLite (dev), modelli principali `User`, `Product`, `Quote`, `QuoteItem`, `DiscountCode`.
- **UI library**: non risultano installate librerie componentistiche tipo shadcn/ui, Radix, MUI.

## Pagine admin (per Sessione B2)

### src/app/(authenticated)/admin/listino/page.tsx

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  code: string;
  name: string;
  block: string;
  type: string;
  positioning: string;
  includes: string;
  objection: string | null;
  response: string | null;
  price: number;
  priceLabel: string | null;
  isMonthly: boolean;
  active: boolean;
  sortOrder: number;
};

const blockLabels: Record<string, string> = {
  FRONTEND: "Front-end",
  "01": "Blocco 01 — Posizionamento",
  "02": "Blocco 02 — Tecnologia CRM",
  "03": "Blocco 03 — Acquisizione",
  "04": "Blocco 04 — Automazioni",
  "06": "Blocco 06 — Direzione e Coaching",
  "07": "Blocco 07 — Consulenza Nicola Busca",
  MEGABUNDLE: "Mega-bundle",
  CANONI_CRM: "Canoni CRM",
  CANONI_AIVOCALE: "Canoni AI Vocale",
  CANONI_WA: "Canoni WhatsApp",
  ADS_GESTITE: "ADS Gestite",
  DCE: "Direzione Commerciale Esterna",
};

const blockOrder = [
  "FRONTEND",
  "01",
  "02",
  "03",
  "04",
  "06",
  "07",
  "MEGABUNDLE",
  "CANONI_CRM",
  "CANONI_AIVOCALE",
  "CANONI_WA",
  "ADS_GESTITE",
  "DCE",
];

const typeLabels: Record<string, { label: string; class: string }> = {
  product: { label: "Standard", class: "bg-mc-orange text-white" },
  variant: { label: "Variante", class: "bg-blue-600 text-white" },
  bundle: { label: "Bundle", class: "bg-mc-green text-white" },
  canone: { label: "Canone", class: "bg-purple-600 text-white" },
};

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminListinoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(
    new Set(["FRONTEND", "01"])
  );

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/preventivi");
      return;
    }
    fetchProducts();
  }, [session, status]);

  async function fetchProducts() {
    setLoading(true);
    const res = await fetch("/api/products?onlyActive=false");
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }

  function startEdit(product: Product) {
    setEditing(product.id);
    setEditForm({
      name: product.name,
      positioning: product.positioning,
      price: product.price,
      priceLabel: product.priceLabel,
      objection: product.objection,
      response: product.response,
      active: product.active,
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditing(null);
    setEditForm({});
  }

  async function saveEdit(productId: string) {
    setSaving(true);
    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Modifiche salvate.");
      setEditing(null);
      setEditForm({});
      fetchProducts();
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage("Errore nel salvataggio.");
    }
  }

  async function toggleActive(product: Product) {
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !product.active }),
    });
    if (res.ok) fetchProducts();
  }

  function toggleBlock(block: string) {
    const newSet = new Set(expandedBlocks);
    if (newSet.has(block)) newSet.delete(block);
    else newSet.add(block);
    setExpandedBlocks(newSet);
  }

  // Raggruppa per blocco
  const productsByBlock = new Map<string, Product[]>();
  for (const block of blockOrder) productsByBlock.set(block, []);
  for (const p of products) {
    const list = productsByBlock.get(p.block) || [];
    list.push(p);
    productsByBlock.set(p.block, list);
  }

  if (status === "loading" || loading) {
    return <div className="text-center py-12 text-mc-muted">Caricamento listino...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl mb-1">Gestione listino</h1>
        <p className="text-mc-muted italic">
          Modifica prezzi, copy e obiezioni di tutti i prodotti. Le modifiche sono immediate nel preventivatore.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border border-mc-green text-mc-green px-4 py-2 rounded mb-4">
          {message}
        </div>
      )}

      <div className="space-y-3">
        {blockOrder.map((block) => {
          const blockProducts = productsByBlock.get(block) || [];
          if (blockProducts.length === 0) return null;
          const isExpanded = expandedBlocks.has(block);

          return (
            <div key={block} className="border border-mc-border rounded overflow-hidden">
              <button
                onClick={() => toggleBlock(block)}
                className="w-full px-4 py-3 flex items-center justify-between bg-mc-beige-warm hover:bg-mc-border transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{isExpanded ? "−" : "+"}</span>
                  <span className="font-semibold">{blockLabels[block]}</span>
                </div>
                <span className="text-xs text-mc-muted">{blockProducts.length} voci</span>
              </button>

              {isExpanded && (
                <div className="divide-y divide-mc-border bg-white">
                  {blockProducts.map((p) => {
                    const isEditing = editing === p.id;

                    return (
                      <div key={p.id} className={`p-4 ${!p.active ? "opacity-50 bg-gray-50" : ""}`}>
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-xs text-mc-muted">{p.code}</span>
                              <span className={`badge ${typeLabels[p.type]?.class}`}>
                                {typeLabels[p.type]?.label}
                              </span>
                            </div>
                            <div>
                              <label className="label">Nome</label>
                              <input
                                type="text"
                                className="input"
                                value={editForm.name || ""}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label">Frase di posizionamento</label>
                              <textarea
                                rows={2}
                                className="input"
                                value={editForm.positioning || ""}
                                onChange={(e) => setEditForm({ ...editForm, positioning: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="label">Prezzo (€ interi)</label>
                                <input
                                  type="number"
                                  className="input"
                                  value={editForm.price || 0}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })
                                  }
                                />
                              </div>
                              <div>
                                <label className="label">
                                  Label prezzo (opzionale, es. &quot;€ 2.497 + € 1.500&quot;)
                                </label>
                                <input
                                  type="text"
                                  className="input"
                                  value={editForm.priceLabel || ""}
                                  onChange={(e) => setEditForm({ ...editForm, priceLabel: e.target.value })}
                                  placeholder="Lascia vuoto per mostrare il prezzo numerico"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="label">Obiezione attesa</label>
                              <textarea
                                rows={2}
                                className="input"
                                value={editForm.objection || ""}
                                onChange={(e) => setEditForm({ ...editForm, objection: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label">Risposta all&apos;obiezione</label>
                              <textarea
                                rows={3}
                                className="input"
                                value={editForm.response || ""}
                                onChange={(e) => setEditForm({ ...editForm, response: e.target.value })}
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => saveEdit(p.id)}
                                disabled={saving}
                                className="btn-primary"
                              >
                                {saving ? "Salvataggio..." : "Salva modifiche"}
                              </button>
                              <button onClick={cancelEdit} className="btn-secondary">
                                Annulla
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-mc-muted">{p.code}</span>
                                <span className={`badge ${typeLabels[p.type]?.class}`}>
                                  {typeLabels[p.type]?.label}
                                </span>
                                {!p.active && (
                                  <span className="badge bg-red-100 text-red-800">Disattivato</span>
                                )}
                              </div>
                              <div className="font-semibold">{p.name}</div>
                              <div className="text-sm text-mc-muted italic mt-1">{p.positioning}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-lg text-mc-orange">
                                {p.priceLabel || formatEuro(p.price)}
                                {p.isMonthly && <span className="text-xs font-normal">/mese</span>}
                              </div>
                              <div className="flex gap-2 mt-2 justify-end">
                                <button
                                  onClick={() => startEdit(p)}
                                  className="text-mc-orange hover:underline text-sm"
                                >
                                  Modifica
                                </button>
                                <button
                                  onClick={() => toggleActive(p)}
                                  className="text-mc-muted hover:text-mc-orange text-sm"
                                >
                                  {p.active ? "Disattiva" : "Attiva"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-xs text-mc-muted italic">
        Nota: i campi &quot;Cosa include&quot; (bullet points) e la gestione dei prerequisiti/bundle non sono
        modificabili da interfaccia in questa versione. Per modifiche strutturali dei prodotti, contattare Claude
        per aggiornare il seed del database.
      </div>
    </div>
  );
}
```

### src/app/(authenticated)/admin/codici-sconto/page.tsx

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type DiscountCode = {
  id: string;
  code: string;
  description: string | null;
  discountPercent: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

export default function AdminCodiciScontoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form nuovo codice
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPercent, setNewPercent] = useState(10);
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/preventivi");
      return;
    }
    fetchCodes();
  }, [session, status]);

  async function fetchCodes() {
    setLoading(true);
    const res = await fetch("/api/discount-codes");
    const data = await res.json();
    setCodes(data);
    setLoading(false);
  }

  async function handleCreate() {
    setFormError("");
    if (!newCode || !newPercent) {
      setFormError("Codice e percentuale obbligatori");
      return;
    }
    const res = await fetch("/api/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode,
        description: newDescription || null,
        discountPercent: newPercent,
        maxUses: newMaxUses ? parseInt(newMaxUses) : null,
        expiresAt: newExpiresAt || null,
      }),
    });
    if (res.ok) {
      setNewCode("");
      setNewDescription("");
      setNewPercent(10);
      setNewMaxUses("");
      setNewExpiresAt("");
      setShowForm(false);
      fetchCodes();
    } else {
      const data = await res.json();
      setFormError(data.error || "Errore");
    }
  }

  async function toggleActive(c: DiscountCode) {
    await fetch(`/api/discount-codes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    fetchCodes();
  }

  async function deleteCode(c: DiscountCode) {
    if (!confirm(`Cancellare il codice "${c.code}"?`)) return;
    await fetch(`/api/discount-codes/${c.id}`, { method: "DELETE" });
    fetchCodes();
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("it-IT");
  }

  if (status === "loading" || loading) {
    return <div className="text-center py-12 text-mc-muted">Caricamento...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl mb-1">Codici sconto</h1>
          <p className="text-mc-muted italic">
            Codici manuali da usare in trattativa (es. AMICO-15, BLACKFRIDAY-20). Sostituiscono lo sconto
            volume automatico.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Annulla" : "+ Nuovo codice"}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6 bg-orange-50">
          <h2 className="text-xl mb-4">Nuovo codice sconto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Codice (sarà convertito in maiuscolo)</label>
              <input
                type="text"
                className="input"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="es. AMICO-15"
              />
            </div>
            <div>
              <label className="label">Sconto (%)</label>
              <input
                type="number"
                className="input"
                value={newPercent}
                onChange={(e) => setNewPercent(parseInt(e.target.value) || 0)}
                min="1"
                max="50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Descrizione (note interne)</label>
              <input
                type="text"
                className="input"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="es. Promo amici/conoscenze, validità 30gg"
              />
            </div>
            <div>
              <label className="label">Numero massimo utilizzi (vuoto = illimitato)</label>
              <input
                type="number"
                className="input"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                placeholder="es. 10"
                min="1"
              />
            </div>
            <div>
              <label className="label">Scadenza (vuoto = nessuna)</label>
              <input
                type="date"
                className="input"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
              />
            </div>
          </div>
          {formError && <p className="text-mc-red text-sm mt-2">{formError}</p>}
          <button onClick={handleCreate} className="btn-primary mt-4">
            Crea codice
          </button>
        </div>
      )}

      {codes.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-mc-muted italic">Nessun codice sconto creato.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-mc-beige-warm">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold">Codice</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Sconto</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Descrizione</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Utilizzi</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Scadenza</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Stato</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-t border-mc-border">
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3 text-mc-green font-semibold">-{c.discountPercent}%</td>
                  <td className="px-4 py-3 text-sm">{c.description || "—"}</td>
                  <td className="px-4 py-3 text-sm">
                    {c.usedCount}
                    {c.maxUses ? ` / ${c.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(c.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${c.active ? "badge-accepted" : "badge-expired"}`}>
                      {c.active ? "Attivo" : "Disattivato"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => toggleActive(c)}
                      className="text-mc-orange hover:underline mr-3"
                    >
                      {c.active ? "Disattiva" : "Attiva"}
                    </button>
                    <button onClick={() => deleteCode(c)} className="text-mc-red hover:underline">
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### src/app/(authenticated)/admin/utenti/page.tsx

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
};

export default function AdminUtentiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form nuovo utente
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("commerciale");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/preventivi");
      return;
    }
    fetchUsers();
  }, [session, status]);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  async function handleCreateUser() {
    setFormError("");
    if (!newName || !newEmail || !newPassword) {
      setFormError("Tutti i campi sono obbligatori");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
    });
    if (res.ok) {
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("commerciale");
      setShowForm(false);
      fetchUsers();
    } else {
      const data = await res.json();
      setFormError(data.error || "Errore");
    }
  }

  async function toggleActive(user: User) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (res.ok) fetchUsers();
  }

  async function deleteUser(user: User) {
    if (!confirm(`Cancellare l'utente ${user.name}? L'azione è irreversibile.`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
  }

  async function resetPassword(user: User) {
    const newPass = prompt(`Nuova password per ${user.name}:`);
    if (!newPass) return;
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass }),
    });
    if (res.ok) alert("Password aggiornata");
  }

  if (status === "loading" || loading) return <div className="text-center py-12 text-mc-muted">Caricamento...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl mb-1">Gestione utenti</h1>
          <p className="text-mc-muted italic">Team commerciale Metodo Cantiere</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Annulla" : "+ Nuovo utente"}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6 bg-orange-50">
          <h2 className="text-xl mb-4">Nuovo utente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome</label>
              <input type="text" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Password iniziale</label>
              <input
                type="text"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Ruolo</label>
              <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="commerciale">Commerciale</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {formError && <p className="text-mc-red text-sm mt-2">{formError}</p>}
          <button onClick={handleCreateUser} className="btn-primary mt-4">
            Crea utente
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-mc-beige-warm">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold">Nome</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Email</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Ruolo</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Stato</th>
              <th className="text-right px-4 py-3 text-sm font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-mc-border">
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4 py-3 text-sm">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.role === "admin" ? "badge-accepted" : "badge-sent"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.active ? "badge-accepted" : "badge-expired"}`}>
                    {u.active ? "Attivo" : "Disattivato"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <button onClick={() => resetPassword(u)} className="text-mc-orange hover:underline mr-3">
                    Reset password
                  </button>
                  <button onClick={() => toggleActive(u)} className="text-mc-orange hover:underline mr-3">
                    {u.active ? "Disattiva" : "Attiva"}
                  </button>
                  {u.id !== session?.user?.id && (
                    <button onClick={() => deleteUser(u)} className="text-mc-red hover:underline">
                      Elimina
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```
