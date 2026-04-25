export function generateStyles(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=IBM+Plex+Mono:wght@400;600&display=swap');

:root {
  --mc-orange: #FF6A00;
  --mc-orange-light: #FFE4D1;
  --mc-black: #1A1A1A;
  --mc-dark: #212121;
  --mc-muted: #706E65;
  --mc-beige: #FAF8F4;
  --mc-beige-warm: #F5F1E8;
  --mc-border: #E5DFD0;
  --mc-green: #2D7A3E;
  --mc-green-bg: #E8F2EA;
  --mc-red: #B23B3B;
  --mc-red-bg: #F8E5E5;
  --mc-blue: #2C5282;
  --mc-blue-bg: #EBF4FB;
}

@page {
  size: A4;
  margin: 0;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  color: var(--mc-black);
  font-size: 11pt;
  line-height: 1.45;
}

h1, h2, h3, .display { font-family: 'Playfair Display', Georgia, serif; }
.mono { font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

.pdf-page {
  width: 210mm;
  height: 297mm;
  padding: 18mm 22mm;
  background: var(--mc-beige);
  position: relative;
  page-break-after: always;
}
.pdf-page:last-child { page-break-after: auto; }

.pdf-page-cover {
  background: var(--mc-black);
  color: var(--mc-beige);
  padding: 22mm;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6mm;
  margin-bottom: 8mm;
  border-bottom: 1px solid var(--mc-border);
}

.page-num {
  font-weight: 800;
  font-size: 18pt;
  color: var(--mc-orange);
}

.no-break {
  page-break-inside: avoid;
  break-inside: avoid;
}

.caps {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 800;
}

.muted { color: var(--mc-muted); }
.orange { color: var(--mc-orange); }
.right { text-align: right; }

.box {
  border: 1px solid var(--mc-border);
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
}
.box-warm { background: var(--mc-beige-warm); }
.box-green { background: var(--mc-green-bg); border-color: #BFD6C5; }
.box-red { background: var(--mc-red-bg); border-color: var(--mc-red); }
.box-blue { background: var(--mc-blue-bg); border-color: #B5D0E8; }
.box-black {
  background: var(--mc-black);
  color: var(--mc-beige);
  border-color: #2A2A2A;
}

table { width: 100%; border-collapse: collapse; }
th, td { padding: 7px 8px; border-bottom: 1px solid #EDE6D6; vertical-align: top; }
th { text-align: left; font-size: 8.5pt; }
td.right, th.right { text-align: right; }

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 8pt;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.badge-orange { background: var(--mc-orange-light); color: var(--mc-black); }
.badge-green { background: var(--mc-green-bg); color: var(--mc-green); border: 1px solid #BFD6C5; }
.badge-dark { background: #2A2A2A; color: var(--mc-beige); }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }

.footer {
  position: absolute;
  left: 22mm;
  right: 22mm;
  bottom: 10mm;
  font-size: 7pt;
  color: var(--mc-muted);
  text-align: center;
}

`;
}

