"""
Applica il campo "Problema riscontrato" ai PDF testuali.
Legge problemi_report.csv e inserisce il testo nel PDF dopo "Rischio Caldo" o "Motivo".
"""

import csv
import re
import fitz
from pathlib import Path

FOLDER = Path(r"H:\DG_Assistenza\Assistenze\2026_Guaresi")
CSV_FILE = FOLDER / "problemi_report.csv"

PROBLEM_LABELS = {
    "installazione": "Installazione",
    "regolazione_selezionatori": "Regolazione selezionatori",
    "regolazione_nastri_pneumatica": "Regolazione nastri e pneumatica",
    "guasto_elettrico": "Guasto elettrico",
    "guasto_meccanico": "Guasto meccanico",
    "verifica_pesatura": "Verifica sistema di pesatura",
    "verifica_cloud": "Verifica cloud",
    "altro": "Altro",
}


def load_csv() -> dict[str, str]:
    """Load filename -> problem mapping from CSV."""
    mapping = {}
    with open(CSV_FILE, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            filename = row["File"].strip()
            problem = row["Problema riscontrato"].strip()
            if filename and problem:
                mapping[filename] = problem
    return mapping


def add_problem_to_pdf(pdf_path: Path, problem_code: str) -> bool:
    """Add 'Problema riscontrato: X' text to a PDF."""
    problem_label = PROBLEM_LABELS.get(problem_code, problem_code)
    
    doc = fitz.open(str(pdf_path))
    page = doc[0]
    text = page.get_text()
    
    if not text.strip():
        # Image-based PDF (JPEG or old format) — can't add text reliably
        doc.close()
        return False
    
    # Check if already has "Problema riscontrato"
    if "Problema riscontrato" in text:
        doc.close()
        return False  # Already has it
    
    # Find position to insert: after "Rischio Caldo" line or after "Motivo" line
    # Look for the text block that contains these keywords
    target_texts = ["Rischio Caldo", "Motivo"]
    insert_point = None
    
    for block in page.get_text("dict")["blocks"]:
        if block["type"] != 0:  # text block
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                for target in target_texts:
                    if target in span["text"]:
                        # Insert below this line
                        bbox = line["bbox"]
                        insert_point = (bbox[0], bbox[3] + 2)  # x, below y
    
    if not insert_point:
        # Fallback: find "Descrizione" and insert above it
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    if "Descrizione" in span["text"]:
                        bbox = line["bbox"]
                        insert_point = (bbox[0], bbox[1] - 6)
                        break
                if insert_point:
                    break
            if insert_point:
                break
    
    if not insert_point:
        doc.close()
        return False
    
    # Insert the text
    x, y = insert_point
    # Label in bold
    page.insert_text((x, y), "Problema riscontrato:", fontsize=9, fontname="helv", color=(0.33, 0.33, 0.33))
    # Value
    page.insert_text((x + 45, y), f"  {problem_label}", fontsize=9, fontname="helv", color=(0.2, 0.2, 0.2))
    
    doc.save(str(pdf_path), incremental=True, encryption=0)
    doc.close()
    return True


def main():
    if not CSV_FILE.exists():
        print(f"❌ File non trovato: {CSV_FILE}")
        return
    
    mapping = load_csv()
    print(f"📋 Caricati {len(mapping)} problemi dal CSV\n")
    
    modified = 0
    skipped = 0
    errors = 0
    
    for filename, problem_code in mapping.items():
        filepath = FOLDER / filename
        if not filepath.exists():
            print(f"  ⚠️  File non trovato: {filename}")
            errors += 1
            continue
        
        if filepath.suffix.lower() in (".jpeg", ".jpg"):
            print(f"  ⏭️  {filename} — immagine, skip")
            skipped += 1
            continue
        
        try:
            result = add_problem_to_pdf(filepath, problem_code)
            if result:
                label = PROBLEM_LABELS.get(problem_code, problem_code)
                print(f"  ✅ {filename} → {label}")
                modified += 1
            else:
                print(f"  ⏭️  {filename} — già presente o PDF immagine")
                skipped += 1
        except Exception as e:
            print(f"  ❌ {filename} — errore: {e}")
            errors += 1
    
    print(f"\n{'='*50}")
    print(f"Modificati: {modified} | Saltati: {skipped} | Errori: {errors}")


if __name__ == "__main__":
    main()
