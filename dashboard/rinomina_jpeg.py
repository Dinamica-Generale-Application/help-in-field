"""
Rinomina le immagini JPEG dei report con la stessa convenzione dei PDF:
  rapporto_[nome-cliente]_[DD-MM-YYYY].jpeg

Usa OCR per estrarre il nome cliente e la data dall'immagine.
Ignora immagini piccole (pagine firma) e quelle non riconosciute come report.

Uso:
    python rinomina_jpeg.py
"""

import re
import sys
from pathlib import Path

try:
    import easyocr
except ImportError:
    print("❌ EasyOCR non installato. Esegui: pip install easyocr")
    input("Premi INVIO per chiudere...")
    sys.exit(1)


def sanitize_filename(name: str) -> str:
    """Converte un nome in slug per filename (come la webapp)."""
    return (
        name.lower()
        .replace("à", "a").replace("è", "e").replace("é", "e")
        .replace("ì", "i").replace("ò", "o").replace("ù", "u")
        .strip()
    )
    # Replace special chars with dashes
def sanitize_filename(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9àèéìòù]+", "-", slug)
    slug = slug.strip("-")
    return slug[:50]


def main():
    folder = Path(r"H:\DG_Assistenza\Assistenze\2026_Guaresi")
    
    jpeg_files = sorted(folder.glob("WhatsApp*.jpeg")) + sorted(folder.glob("WhatsApp*.jpg"))
    
    if not jpeg_files:
        print("Nessun file WhatsApp JPEG trovato da rinominare.")
        input("Premi INVIO per chiudere...")
        return

    print(f"📷 Trovati {len(jpeg_files)} file WhatsApp da rinominare")
    print("⏳ Inizializzazione OCR...")
    
    reader = easyocr.Reader(['it', 'en'], gpu=False, verbose=False)
    
    renamed = 0
    skipped = 0
    
    for img_path in jpeg_files:
        # Skip small images (signature pages, < 30KB)
        if img_path.stat().st_size < 30000:
            print(f"  ⏭️  {img_path.name} — troppo piccolo (pagina firma), skip")
            skipped += 1
            continue
        
        # OCR
        results = reader.readtext(str(img_path))
        lines = [text for (_, text, conf) in results if conf > 0.4]
        text = "\n".join(lines)
        
        # Check if it's a report
        if "Rapporto" not in text and "Ragione Sociale" not in text:
            print(f"  ⏭️  {img_path.name} — non sembra un report, skip")
            skipped += 1
            continue
        
        # Extract company name
        company = ""
        for i, line in enumerate(lines):
            if "ragione sociale" in line.lower():
                if ":" in line:
                    parts = line.split(":", 1)
                    if parts[1].strip():
                        company = parts[1].strip()
                        break
                if i + 1 < len(lines):
                    next_line = lines[i + 1]
                    if not any(lbl in next_line for lbl in ["Dettagli", "Dati", "Data", "Operatore"]):
                        company = next_line.strip()
                break
        
        # Extract date (DD/MM/YYYY)
        date_match = re.search(r"(\d{2})/(\d{2})/(\d{4})", text)
        if date_match:
            date_str = f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"
        else:
            date_str = "00-00-0000"
        
        if not company:
            print(f"  ⏭️  {img_path.name} — nome cliente non trovato, skip")
            skipped += 1
            continue
        
        # Build new filename
        company_slug = sanitize_filename(company)
        new_name = f"rapporto_{company_slug}_{date_str}.jpeg"
        new_path = folder / new_name
        
        # Avoid overwriting existing files
        counter = 1
        while new_path.exists():
            new_name = f"rapporto_{company_slug}_{date_str}_{counter}.jpeg"
            new_path = folder / new_name
            counter += 1
        
        print(f"  ✅ {img_path.name}")
        print(f"     → {new_name}")
        img_path.rename(new_path)
        renamed += 1

    print(f"\n{'='*50}")
    print(f"Rinominati: {renamed} | Saltati: {skipped}")
    input("\nPremi INVIO per chiudere...")


if __name__ == "__main__":
    main()
