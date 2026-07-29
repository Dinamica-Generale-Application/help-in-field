import fitz
from pathlib import Path

folder = Path(r"H:\DG_Assistenza\Assistenze\2026_Guaresi")
matches = list(folder.glob("*bernadelli*29-07*"))
if not matches:
    print("File non trovato")
    exit()

pdf_path = matches[0]
print(f"File: {pdf_path.name}")

doc = fitz.open(str(pdf_path))
page = doc[0]
text = page.get_text()

if "Problema riscontrato" in text:
    print("Gia presente")
else:
    insert_point = None
    for block in page.get_text("dict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                if "Rischio Caldo" in span["text"] or "Motivo" in span["text"]:
                    bbox = line["bbox"]
                    insert_point = (bbox[0], bbox[3] + 2)

    if insert_point:
        x, y = insert_point
        page.insert_text((x, y), "Problema riscontrato:", fontsize=9, fontname="helv", color=(0.33, 0.33, 0.33))
        page.insert_text((x + 45, y), "  Altro", fontsize=9, fontname="helv", color=(0.2, 0.2, 0.2))
        doc.save(str(pdf_path), incremental=True, encryption=0)
        print("OK - aggiunto Altro")
    else:
        print("Punto inserimento non trovato")

doc.close()
