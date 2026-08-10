"""
Aggiunge un'immagine a un PDF esistente.
"""

import fitz  # PyMuPDF
from pathlib import Path
import sys

def add_image_to_pdf(pdf_path: Path, image_path: Path, output_path: Path = None):
    """Aggiunge un'immagine come nuova pagina alla fine del PDF."""
    
    if not pdf_path.exists():
        print(f"❌ PDF non trovato: {pdf_path}")
        return False
    
    if not image_path.exists():
        print(f"❌ Immagine non trovata: {image_path}")
        return False
    
    try:
        # Apri il PDF
        doc = fitz.open(str(pdf_path))
        
        # Carica l'immagine
        img = fitz.open(str(image_path))
        
        # Converti l'immagine in PDF (una pagina)
        img_pdf = fitz.open()
        
        # Ottieni dimensioni immagine
        img_page = img[0]  # Prima pagina dell'immagine
        img_rect = img_page.rect
        
        # Crea una nuova pagina con le stesse dimensioni dell'immagine
        # Ma limitiamo a dimensioni ragionevoli (A4 landscape max)
        max_width = 842  # A4 landscape width in points
        max_height = 595  # A4 landscape height in points
        
        # Scala l'immagine se necessario
        scale = min(max_width / img_rect.width, max_height / img_rect.height, 1.0)
        new_width = img_rect.width * scale
        new_height = img_rect.height * scale
        
        # Aggiungi nuova pagina al documento originale
        new_page = doc.new_page(width=new_width, height=new_height)
        
        # Inserisci l'immagine nella nuova pagina
        new_page.insert_image(
            fitz.Rect(0, 0, new_width, new_height),
            filename=str(image_path)
        )
        
        # Aggiungi didascalia
        new_page.insert_text(
            (10, new_height - 10),
            "Allegato fotografico",
            fontsize=10,
            color=(0.3, 0.3, 0.3)
        )
        
        # Salva
        if output_path is None:
            # Salva con nuovo nome (poi lo rinominiamo)
            temp_path = pdf_path.with_suffix('.tmp.pdf')
            doc.save(str(temp_path))
            doc.close()
            img.close()
            
            # Sovrascrivi originale
            import os
            os.replace(str(temp_path), str(pdf_path))
            output_path = pdf_path
        else:
            doc.save(str(output_path))
            doc.close()
            img.close()
        
        print(f"✅ Immagine aggiunta a: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Errore: {e}")
        return False


if __name__ == "__main__":
    folder = Path(r'H:\DG_Assistenza\Assistenze\2026_Assistenze_in campo')
    pdf_file = folder / 'rapporto_nicola-natale_03-08-2026-1_260805_152827.pdf'
    image_file = Path(r'C:\Users\nicola\Documents\kiro\app\assistenza\dashboard\allegato_pomodori.jpg.jpeg')
    
    if not image_file.exists():
        print(f"⚠️  Immagine non trovata: {image_file}")
        print("   Salva prima l'immagine in questa posizione.")
        sys.exit(1)
    
    add_image_to_pdf(pdf_file, image_file)
