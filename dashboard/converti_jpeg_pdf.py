"""
Converte i rapporti JPEG in PDF testuali con lo stesso formato della webapp.
Usa OCR per estrarre i dati e genera un PDF con testo reale (parsabile).

Uso:
    python converti_jpeg_pdf.py

Dopo la conversione, i JPEG possono essere eliminati.
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

try:
    from fpdf import FPDF
except ImportError:
    print("❌ fpdf2 non installato. Esegui: pip install fpdf2")
    input("Premi INVIO per chiudere...")
    sys.exit(1)


FOLDER = Path(r"H:\DG_Assistenza\Assistenze\2026_Guaresi")
HOURLY_RATE = 60
KM_RATE = 0.9


def ocr_image(reader, image_path: Path) -> dict | None:
    """Estrae dati strutturati da un'immagine report via OCR."""
    if image_path.stat().st_size < 30000:
        return None  # Pagina firma, skip

    results = reader.readtext(str(image_path))
    lines = [text for (_, text, conf) in results if conf > 0.4]
    text = "\n".join(lines)

    if "Rapporto" not in text and "Ragione Sociale" not in text:
        return None

    def find_after(label: str) -> str:
        for i, line in enumerate(lines):
            if label.lower() in line.lower():
                if ":" in line:
                    parts = line.split(":", 1)
                    if parts[1].strip():
                        return parts[1].strip()
                if i + 1 < len(lines):
                    next_line = lines[i + 1]
                    if not any(lbl in next_line for lbl in ["Dettagli", "Dati Cliente", "Costi", "Voce", "Dispositivi", "Allegati", "Firma"]):
                        return next_line.strip()
            # Also check if label is at end of line with value on next
        return ""

    data = {}
    data["companyName"] = find_after("Ragione Sociale")

    # Date
    date_match = re.search(r"(\d{2})/(\d{2})/(\d{4})", text)
    if date_match:
        data["date_display"] = f"{date_match.group(1)}/{date_match.group(2)}/{date_match.group(3)}"
    else:
        data["date_display"] = ""

    data["operator1"] = find_after("Operatore 1")
    data["operator2"] = find_after("Operatore 2")
    data["location"] = find_after("Luogo")
    data["requestedBy"] = find_after("Richiesto da")
    data["onBehalfOf"] = find_after("Per conto di") or "Fyeld"
    data["reason"] = find_after("Motivo")
    data["description"] = find_after("Descrizione")
    data["notes"] = find_after("Note")

    # Hours
    hours_match = re.search(r"(\d+[.,]?\d*)\s*ore", text)
    data["hours"] = float(hours_match.group(1).replace(",", ".")) if hours_match else 0

    # Km
    km_match = re.search(r"(\d+[.,]?\d*)\s*km", text)
    data["km"] = float(km_match.group(1).replace(",", ".")) if km_match else 0

    if not data["companyName"] and not data["date_display"]:
        return None

    return data


def generate_pdf(data: dict, output_path: Path):
    """Genera un PDF testuale con il layout standard del rapporto."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Rapporto di Assistenza Tecnica", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(5)

    def section_title(title):
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(26, 26, 26)
        pdf.cell(0, 7, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

    def field(label, value):
        if not value:
            return
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(85, 85, 85)
        pdf.cell(45, 5, f"{label}:")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(51, 51, 51)
        pdf.multi_cell(0, 5, str(value), new_x="LMARGIN", new_y="NEXT")

    # Dati Cliente
    section_title("Dati Cliente")
    field("Ragione Sociale", data["companyName"])
    pdf.ln(3)

    # Dettagli Intervento
    section_title("Dettagli Intervento")
    field("Data", data["date_display"])
    field("Operatore 1", data["operator1"])
    if data.get("operator2"):
        field("Operatore 2", data["operator2"])
    field("Luogo", data.get("location"))
    field("Richiesto da", data.get("requestedBy"))
    field("Per conto di", data.get("onBehalfOf"))
    field("Motivo", data.get("reason"))
    field("Descrizione", data.get("description"))
    if data.get("notes"):
        field("Note", data["notes"])
    pdf.ln(3)

    # Costi
    section_title("Costi")
    hours = data.get("hours", 0)
    km = data.get("km", 0)
    hourly_total = round(hours * HOURLY_RATE, 2)
    km_total = round(km * KM_RATE, 2)
    grand_total = round(hourly_total + km_total, 2)

    # Table header
    pdf.set_fill_color(245, 245, 245)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(85, 85, 85)
    pdf.cell(50, 6, "Voce", fill=True)
    pdf.cell(70, 6, "Dettaglio", fill=True)
    pdf.cell(0, 6, "Importo", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(51, 51, 51)

    pdf.cell(50, 6, "Ore lavorate")
    pdf.cell(70, 6, f"{hours} ore x {HOURLY_RATE},00 EUR/h")
    pdf.cell(0, 6, f"{hourly_total:.2f} EUR".replace(".", ","), new_x="LMARGIN", new_y="NEXT")

    pdf.cell(50, 6, "Chilometri")
    pdf.cell(70, 6, f"{km} km x {KM_RATE:.2f} EUR/km".replace(".", ","))
    pdf.cell(0, 6, f"{km_total:.2f} EUR".replace(".", ","), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(1)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(50, 6, "Totale Intervento")
    pdf.cell(70, 6, "")
    pdf.cell(0, 6, f"{grand_total:.2f} EUR".replace(".", ","), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Firma
    section_title("Firma e Timbro")
    pdf.ln(20)
    pdf.set_draw_color(51, 51, 51)
    pdf.line(20, pdf.get_y(), 85, pdf.get_y())
    pdf.line(120, pdf.get_y(), 185, pdf.get_y())
    pdf.ln(3)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(85, 85, 85)
    pdf.cell(95, 5, "Firma Tecnico", align="C")
    pdf.cell(0, 5, "Timbro e Firma Cliente", align="C")

    pdf.output(str(output_path))


def main():
    jpeg_files = sorted(FOLDER.glob("rapporto_*.jpeg")) + sorted(FOLDER.glob("rapporto_*.jpg"))

    if not jpeg_files:
        print("Nessun file rapporto_*.jpeg trovato.")
        input("Premi INVIO per chiudere...")
        return

    print(f"📷 Trovati {len(jpeg_files)} JPEG da convertire")
    print("⏳ Inizializzazione OCR...")

    reader = easyocr.Reader(['it', 'en'], gpu=False, verbose=False)

    converted = 0
    skipped = 0

    for img_path in jpeg_files:
        print(f"\n  Elaboro: {img_path.name}...")
        data = ocr_image(reader, img_path)

        if not data:
            print(f"  ⏭️  Saltato (non un report o troppo piccolo)")
            skipped += 1
            continue

        # Output PDF con stesso nome ma estensione .pdf
        pdf_name = img_path.stem + ".pdf"
        pdf_path = FOLDER / pdf_name

        if pdf_path.exists():
            print(f"  ⏭️  PDF già esistente: {pdf_name}")
            skipped += 1
            continue

        generate_pdf(data, pdf_path)
        print(f"  ✅ → {pdf_name} (cliente: {data['companyName']})")
        converted += 1

    print(f"\n{'='*50}")
    print(f"Convertiti: {converted} | Saltati: {skipped}")

    if converted > 0:
        print(f"\nI JPEG originali possono essere eliminati se non servono più.")

    input("\nPremi INVIO per chiudere...")


if __name__ == "__main__":
    main()
