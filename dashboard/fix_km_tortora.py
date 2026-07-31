"""
Script per aggiornare i km nel report Tortora e ricalcolare i costi.
"""

import re
import fitz  # PyMuPDF
from pathlib import Path


def update_report_km(pdf_path: Path, new_km: int):
    """Aggiorna i km nel PDF e ricalcola i costi."""
    
    doc = fitz.open(str(pdf_path))
    
    # Read all text to extract current values
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    
    print(f"📄 File: {pdf_path.name}")
    
    # Extract current values
    hours_match = re.search(r"Ore lavorate\s*(\d+[.,]?\d*)\s*ore", full_text)
    old_km_match = re.search(r"Chilometri\s*(\d+[.,]?\d*)\s*km", full_text)
    hourly_rate_match = re.search(r"Ore lavorate\s*\d+[.,]?\d*\s*ore\s*×\s*(\d+[.,]?\d*)", full_text)
    km_rate_match = re.search(r"Chilometri\s*\d+[.,]?\d*\s*km\s*×\s*(\d+[.,]?\d*)", full_text)
    discount_match = re.search(r"Sconto\s*(-?\d+[.,]?\d*)\s*%", full_text)
    
    hours = float(hours_match.group(1).replace(",", ".")) if hours_match else 0
    old_km = float(old_km_match.group(1).replace(",", ".")) if old_km_match else 0
    hourly_rate = float(hourly_rate_match.group(1).replace(",", ".")) if hourly_rate_match else 60
    km_rate = float(km_rate_match.group(1).replace(",", ".")) if km_rate_match else 0.80
    discount_pct = float(discount_match.group(1).replace(",", ".")) if discount_match else 0
    
    # Check for travel hours (new format)
    travel_hours_match = re.search(r"Ore viaggio\s*(\d+[.,]?\d*)\s*ore", full_text)
    has_travel = travel_hours_match is not None
    travel_rate = 60  # €/h
    
    print(f"   Ore lavorate: {hours} × {hourly_rate} €/h")
    print(f"   Km attuali: {old_km} → Nuovi km: {new_km}")
    print(f"   Tariffa km: {km_rate} €/km")
    print(f"   Sconto: {discount_pct}%")
    print(f"   Ha ore viaggio: {has_travel}")
    
    # Calculate new costs
    hours_cost = hours * hourly_rate
    new_km_cost = new_km * km_rate
    
    # Travel hours: km / 55
    new_travel_hours = new_km / 55
    new_travel_cost = new_travel_hours * travel_rate
    
    subtotal = hours_cost + new_km_cost + new_travel_cost
    discount_amount = subtotal * (discount_pct / 100)
    taxable = subtotal - discount_amount
    vat = taxable * 0.22
    grand_total = taxable + vat
    
    print(f"\n   Nuovi costi:")
    print(f"   - Ore lavorate: {hours_cost:.2f} €")
    print(f"   - Chilometri: {new_km_cost:.2f} €")
    print(f"   - Ore viaggio: {new_travel_hours:.2f} h × {travel_rate} € = {new_travel_cost:.2f} €")
    print(f"   - Subtotale: {subtotal:.2f} €")
    print(f"   - Sconto: -{discount_amount:.2f} €")
    print(f"   - Imponibile: {taxable:.2f} €")
    print(f"   - IVA 22%: {vat:.2f} €")
    print(f"   - TOTALE: {grand_total:.2f} €")
    
    # Now we need to edit the PDF
    # PDF editing with PyMuPDF is complex for text replacement
    # We'll redact and rewrite the specific values
    
    for page in doc:
        # Find and replace km value
        text_instances = page.search_for(f"{int(old_km)} km")
        for inst in text_instances:
            page.add_redact_annot(inst, fill=(1, 1, 1))
        
        # Also search with decimal
        text_instances = page.search_for(f"{old_km:.1f} km".replace(".", ","))
        for inst in text_instances:
            page.add_redact_annot(inst, fill=(1, 1, 1))
        
        page.apply_redactions()
    
    doc.close()
    
    print("\n⚠️  La modifica diretta del PDF è complessa.")
    print("   Ti consiglio di:")
    print("   1. Aprire il report nella webapp")
    print("   2. Modificare i km a 255")
    print("   3. Riesportare il PDF")
    print("\n   Oppure posso creare un nuovo PDF con i dati corretti.")


def main():
    folder = Path(r"H:\DG_Assistenza\Assistenze\2026_Guaresi")
    
    # Find the file
    pattern = "rapporto_tortora-salvatore_31-07-2026*.pdf"
    files = list(folder.glob(pattern))
    
    if not files:
        # Try more flexible pattern
        files = list(folder.glob("*tortora*31-07-2026*.pdf"))
    
    if not files:
        print(f"❌ File non trovato con pattern: {pattern}")
        print(f"   Cartella: {folder}")
        # List available files
        all_pdfs = list(folder.glob("rapporto_*.pdf"))
        print(f"\n   File disponibili ({len(all_pdfs)}):")
        for f in sorted(all_pdfs)[-10:]:
            print(f"   - {f.name}")
        return
    
    pdf_path = files[0]
    update_report_km(pdf_path, 255)


if __name__ == "__main__":
    main()
    input("\nPremi INVIO per chiudere...")
