from pathlib import Path

path = Path("src/lib/pdf/template.ts")
s = path.read_text(encoding="utf-8")
a = s.find('${renderItemsTable("DIREZIONE E COACHING OPERATIVO"')
a_end = s.find(")}", a) + 2
line_after = s.find("\n", a_end) + 1
b = s.find('    <div class="no-break box box-warm" style="margin-top:8mm', line_after)
sec = s.find("  </section>\n  `", b)
if b < 0 or sec < 0:
    raise SystemExit(f"marks not found b={b} sec={sec}")
new_s = s[:line_after] + s[sec:]
path.write_text(new_s, encoding="utf-8")
print("Removed box, delta", len(s) - len(new_s))
