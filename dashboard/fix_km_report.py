"""
Script per aggiornare i km in un report PDF e rigenerare con costi corretti.
Uso: python fix_km_report.py <nome_file_parziale> <nuovi_km>
"""

import re
import sys
import fitz  # PyMuPDF
from pathlib import Path
from datetime import datetime


def extract_report_data(pdf_path: Path) -> dict:
    """Estrae tutti i dati dal PDF."""
    doc = fitz.open(str(pdf_path))
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    
    def find_field(label: str) -> str:
        pattern = rf"{re.escape(label)}:\n(.+?)(?:\n|$)"
        match = re.search(pattern, text)
        if match:
            value = match.group(1).strip()
            if value and not value.endswith(":"):
                return value
        return ""
    
    data = {}
    data["companyName"] = find_field("Ragione Sociale")
    data["address"] = find_field("Indirizzo")
    data["phone"] = find_field("Telefono")
    data["interventionDate"] = find_field("Data")
    data["operator1"] = find_field("Operatore 1")
    data["operator2"] = find_field("Operatore 2")
    data["interventionLocation"] = find_field("Luogo") or find_field("Luogo Intervento")
    data["requestedBy"] = find_field("Richiesto da")
    data["onBehalfOf"] = find_field("Per conto di")
    data["interventionReason"] = find_field("Motivo") or find_field("Motivo richiesta intervento")
    data["problemFound"] = find_field("Problema riscontrato")
    data["heatRisk"] = find_field("Rischio Caldo")
    data["description"] = find_field("Descrizione") or find_field("Descrizione dettagliata")
    data["notes"] = find_field("Note")
    
    # Extract costs
    hours_match = re.search(r"Ore lavorate\s*(\d+[.,]?\d*)\s*ore", text)
    data["hours"] = float(hours_match.group(1).replace(",", ".")) if hours_match else 0
    
    km_match = re.search(r"Chilometri\s*(\d+[.,]?\d*)\s*km", text)
    data["kilometers"] = float(km_match.group(1).replace(",", ".")) if km_match else 0
    
    # Rates
    hourly_rate_match = re.search(r"Ore lavorate.*?×\s*(\d+[.,]?\d*)", text)
    data["hourlyRate"] = float(hourly_rate_match.group(1).replace(",", ".")) if hourly_rate_match else 60
    
    km_rate_match = re.search(r"Chilometri.*?×\s*(\d+[.,]?\d*)", text)
    data["kmRate"] = float(km_rate_match.group(1).replace(",", ".")) if km_rate_match else 0.80
    
    discount_match = re.search(r"Sconto\s*(-?\d+[.,]?\d*)\s*%", text)
    data["discount"] = float(discount_match.group(1).replace(",", ".")) if discount_match else 0
    
    return data


def generate_pdf(data: dict, output_path: Path):
    """Genera un nuovo PDF con i dati aggiornati."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4
    
    # Fonts
    font = "helv"
    font_bold = "hebo"
    
    # Colors
    blue = (0.09, 0.24, 0.42)
    gray = (0.4, 0.4, 0.4)
    black = (0, 0, 0)
    
    y = 50
    margin = 50
    
    # Header
    page.insert_text((margin, y), "RAPPORTO DI ASSISTENZA", fontname=font_bold, fontsize=16, color=blue)
    y += 30
    
    # Company info section
    page.insert_text((margin, y), "Dati Cliente", fontname=font_bold, fontsize=12, color=blue)
    y += 20
    
    fields = [
        ("Ragione Sociale", data.get("companyName", "")),
        ("Indirizzo", data.get("address", "")),
        ("Telefono", data.get("phone", "")),
    ]
    
    for label, value in fields:
        if value:
            page.insert_text((margin, y), f"{label}:", fontname=font_bold, fontsize=10, color=gray)
            page.insert_text((margin + 100, y), value, fontname=font, fontsize=10, color=black)
            y += 15
    
    y += 10
    
    # Intervention details
    page.insert_text((margin, y), "Dettagli Intervento", fontname=font_bold, fontsize=12, color=blue)
    y += 20
    
    fields = [
        ("Data", data.get("interventionDate", "")),
        ("Operatore 1", data.get("operator1", "")),
        ("Operatore 2", data.get("operator2", "")),
        ("Luogo", data.get("interventionLocation", "")),
        ("Richiesto da", data.get("requestedBy", "")),
        ("Per conto di", data.get("onBehalfOf", "")),
        ("Motivo richiesta intervento", data.get("interventionReason", "")),
        ("Problema riscontrato", data.get("problemFound", "")),
        ("Rischio Caldo", data.get("heatRisk", "")),
    ]
    
    for label, value in fields:
        if value:
            page.insert_text((margin, y), f"{label}:", fontname=font_bold, fontsize=10, color=gray)
            page.insert_text((margin + 150, y), value, fontname=font, fontsize=10, color=black)
            y += 15
    
    y += 10
    
    # Description
    if data.get("description"):
        page.insert_text((margin, y), "Descrizione dettagliata:", fontname=font_bold, fontsize=10, color=gray)
        y += 15
        # Wrap text
        desc = data["description"]
        words = desc.split()
        line = ""
        for word in words:
            test_line = f"{line} {word}".strip()
            if len(test_line) > 80:
                page.insert_text((margin, y), line, fontname=font, fontsize=10, color=black)
                y += 12
                line = word
            else:
                line = test_line
        if line:
            page.insert_text((margin, y), line, fontname=font, fontsize=10, color=black)
            y += 15
    
    y += 10
    
    # Costs section
    page.insert_text((margin, y), "Costi", fontname=font_bold, fontsize=12, color=blue)
    y += 20
    
    hours = data.get("hours", 0)
    km = data.get("kilometers", 0)
    hourly_rate = data.get("hourlyRate", 60)
    km_rate = data.get("kmRate", 0.80)
    discount_pct = data.get("discount", 0)
    travel_rate = 60
    
    hours_cost = hours * hourly_rate
    km_cost = km * km_rate
    travel_hours = km / 55
    travel_cost = travel_hours * travel_rate
    
    subtotal = hours_cost + km_cost + travel_cost
    discount_amount = subtotal * (discount_pct / 100)
    taxable = subtotal - discount_amount
    vat = taxable * 0.22
    grand_total = taxable + vat
    
    # Cost table
    costs = [
        ("Ore lavorate", f"{hours} ore", f"× {hourly_rate:.2f} €/h", f"{hours_cost:.2f} €"),
        ("Chilometri", f"{km} km", f"× {km_rate:.2f} €/km", f"{km_cost:.2f} €"),
        ("Ore viaggio", f"{travel_hours:.2f} ore", f"× {travel_rate:.2f} €/h", f"{travel_cost:.2f} €"),
    ]
    
    for item in costs:
        page.insert_text((margin, y), item[0], fontname=font, fontsize=10, color=black)
        page.insert_text((margin + 120, y), item[1], fontname=font, fontsize=10, color=black)
        page.insert_text((margin + 200, y), item[2], fontname=font, fontsize=10, color=gray)
        page.insert_text((margin + 300, y), item[3], fontname=font, fontsize=10, color=black)
        y += 15
    
    y += 5
    page.draw_line((margin, y), (page.rect.width - margin, y), color=gray, width=0.5)
    y += 10
    
    # Totals
    totals = [
        ("Subtotale", f"{subtotal:.2f} €"),
    ]
    if discount_pct > 0:
        totals.append((f"Sconto {discount_pct:.0f}%", f"-{discount_amount:.2f} €"))
    totals.extend([
        ("Imponibile", f"{taxable:.2f} €"),
        ("IVA 22%", f"{vat:.2f} €"),
    ])
    
    for label, value in totals:
        page.insert_text((margin + 200, y), label, fontname=font, fontsize=10, color=gray)
        page.insert_text((margin + 300, y), value, fontname=font, fontsize=10, color=black)
        y += 15
    
    y += 5
    page.draw_line((margin + 200, y), (page.rect.width - margin, y), color=blue, width=1)
    y += 10
    
    page.insert_text((margin + 200, y), "Totale Intervento", fontname=font_bold, fontsize=11, color=blue)
    page.insert_text((margin + 300, y), f"{grand_total:.2f} €", fontname=font_bold, fontsize=11, color=blue)
    
    # Notes
    if data.get("notes"):
        y += 30
        page.insert_text((margin, y), "Note:", fontname=font_bold, fontsize=10, color=gray)
        y += 15
        page.insert_text((margin, y), data["notes"], fontname=font, fontsize=10, color=black)
    
    # Footer
    page.insert_text((margin, 800), f"Generato il {datetime.now().strftime('%d/%m/%Y %H:%M')}", 
                     fontname=font, fontsize=8, color=gray)
    
    doc.save(str(output_path))
    doc.close()
    
    print(f"✅ PDF rigenerato: {output_path.name}")
    print(f"   Km: {km}")
    print(f"   Ore viaggio: {travel_hours:.2f}")
    print(f"   Totale: {grand_total:.2f} €")


def main():
    if len(sys.argv) < 3:
        print("Uso: python fix_km_report.py <nome_file_parziale> <nuovi_km>")
        print("Es:  python fix_km_report.py tortora 255")
        return
    
    file_pattern = sys.argv[1]
    new_km = int(sys.argv[2])
    
    folder = Path(r"H:\DG_Assistenza\Assistenze\2026_Guaresi")
    
    # Find matching files
    files = list(folder.glob(f"*{file_pattern}*.pdf"))
    
    if not files:
        print(f"❌ Nessun file trovato con pattern: *{file_pattern}*.pdf")
        return
    
    if len(files) > 1:
        print(f"⚠️  Trovati {len(files)} file. Specifica meglio:")
        for f in files:
            print(f"   - {f.name}")
        return
    
    pdf_path = files[0]
    print(f"📄 Elaboro: {pdf_path.name}")
    
    # Extract data
    data = extract_report_data(pdf_path)
    print(f"   Km attuali: {data['kilometers']} → Nuovi: {new_km}")
    
    # Update km
    data["kilometers"] = new_km
    
    # Generate new PDF (overwrite)
    generate_pdf(data, pdf_path)


if __name__ == "__main__":
    main()
