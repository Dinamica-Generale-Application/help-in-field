"""Quick test of the new parsing on actual PDFs."""
import re
import fitz
from pathlib import Path

folder = Path(r"H:\DG_Assistenza\Assistenze\2026_Guaresi")
pdfs = sorted(folder.glob("rapporto_*.pdf"))

def find_field(text, label):
    pattern = rf"{re.escape(label)}:\n(.+?)(?:\n|$)"
    match = re.search(pattern, text)
    if not match:
        return None
    value = match.group(1).strip()
    if not value or value.endswith(":") or value in ("Dati Cliente", "Dettagli Intervento", "Dispositivi", "Costi", "Allegati", "Firma e Timbro"):
        return None
    return value

for pdf_path in pdfs:
    doc = fitz.open(str(pdf_path))
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    if not text.strip():
        continue
    
    company = find_field(text, "Ragione Sociale")
    requested = find_field(text, "Richiesto da")
    on_behalf = find_field(text, "Per conto di")
    reason = find_field(text, "Motivo")
    print(f"{pdf_path.name}:")
    print(f"  Cliente: {company}")
    print(f"  Richiesto da: {requested}")
    print(f"  Per conto di: {on_behalf}")
    print(f"  Motivo: {reason}")
    print()
