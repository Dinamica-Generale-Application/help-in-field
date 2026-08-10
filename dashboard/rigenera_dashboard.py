"""
Rigenera la dashboard nella cartella dei PDF.
"""

import sys
sys.path.insert(0, '.')

from genera_dashboard import load_reports, generate_dashboard_html
from pathlib import Path
import os

folder = Path(r'H:\DG_Assistenza\Assistenze\2026_Assistenze_in campo')

print(f"📂 Scansione: {folder}")
print(f"   Cerco file rapporto_*.pdf...")

reports = load_reports(folder)

if not reports:
    print("\n⚠️  Nessun PDF con testo trovato.")
    sys.exit(1)

print(f"✅ Estratti dati da {len(reports)} rapporti")

# Generate dashboard
html = generate_dashboard_html(reports)
output_path = folder / "dashboard.html"
output_path.write_text(html, encoding="utf-8")

print(f"📊 Dashboard generata: {output_path}")

# Auto-open in browser
try:
    os.startfile(str(output_path))
    print("   Aperta nel browser.")
except Exception:
    print("   Aprila manualmente con il browser.")
