"""
Script per correggere il campo "Per conto di" nei PDF testuali.
Sostituisce varianti di "Fyeld xxx" con "Fyeld".
"""

import fitz
from pathlib import Path

folder = Path(r"H:\DG_Assistenza\Assistenze\2026_Guaresi")
pdfs = sorted(folder.glob("rapporto_*.pdf"))

# Valori da sostituire -> valore corretto
REPLACEMENTS = {
    "Fyeld SPA": "Fyeld",
    "Fyeld S.p.A.": "Fyeld",
    "Fyeld spa": "Fyeld",
    "Fyeld s.p.a.": "Fyeld",
}

print(f"Scansione {len(pdfs)} PDF in {folder}\n")

modified = 0

for pdf_path in pdfs:
    doc = fitz.open(str(pdf_path))
    changed = False

    for page in doc:
        for old_text, new_text in REPLACEMENTS.items():
            instances = page.search_for(old_text)
            if instances:
                for rect in instances:
                    # Redact (white out) the old text
                    page.add_redact_annot(rect, new_text, fontsize=9, fontname="helv")
                changed = True

        if changed:
            page.apply_redactions()

    if changed:
        doc.save(str(pdf_path), incremental=True, encryption=0)
        print(f"  ✅ Corretto: {pdf_path.name}")
        modified += 1
    else:
        pass  # No changes needed

    doc.close()

print(f"\n{'='*50}")
print(f"Modificati {modified} PDF su {len(pdfs)} totali.")
