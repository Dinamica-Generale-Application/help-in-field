"""Test parsing dei costi dalle immagini OCR."""
import re
import easyocr
from pathlib import Path

folder = Path(r"H:\DG_Assistenza\Assistenze\2026_Guaresi")
jpegs = sorted(folder.glob("rapporto_*.jpeg"))

reader = easyocr.Reader(['it', 'en'], gpu=False, verbose=False)

for img_path in jpegs:
    if img_path.stat().st_size < 30000:
        continue
    
    results = reader.readtext(str(img_path))
    lines = [text for (_, text, conf) in results if conf > 0.4]
    text = "\n".join(lines)
    
    print(f"\n{img_path.name}:")
    
    # Show cost-related lines
    for line in lines:
        if any(k in line.lower() for k in ["ore", "km", "totale", "€"]):
            print(f"  >> {line}")
    
    # Test regex
    hours_match = re.search(r"(\d+[.,]?\d*)\s*ore", text)
    km_match = re.search(r"(\d+[.,]?\d*)\s*km", text)
    total_match = re.search(r"Totale.*?(\d+[.,]\d+)\s*€", text)
    
    print(f"  Ore: {hours_match.group(1) if hours_match else 'NOT FOUND'}")
    print(f"  Km: {km_match.group(1) if km_match else 'NOT FOUND'}")
    print(f"  Totale: {total_match.group(1) if total_match else 'NOT FOUND'}")
