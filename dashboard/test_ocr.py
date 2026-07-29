"""Test OCR on all JPEGs to see what text we can extract."""
import easyocr
from pathlib import Path

folder = Path(r"H:\DG_Assistenza\Assistenze\2026_Guaresi")
jpegs = sorted(folder.glob("*.jpeg")) + sorted(folder.glob("*.jpg"))

if not jpegs:
    print("Nessun JPEG trovato")
    exit()

reader = easyocr.Reader(['it', 'en'], gpu=False)

for jpeg_path in jpegs:
    print(f"\n{'='*60}")
    print(f"File: {jpeg_path.name} ({jpeg_path.stat().st_size // 1024} KB)")
    print(f"{'='*60}")
    
    results = reader.readtext(str(jpeg_path))
    
    for (bbox, text, confidence) in results:
        if confidence > 0.3:
            print(f"  [{confidence:.2f}] {text}")
