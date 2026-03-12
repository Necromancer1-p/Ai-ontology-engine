import os
import sys

try:
    import PyPDF2
except ImportError:
    pass

def find_pdf(start_dir, filename="chetan work.pdf"):
    for root, dirs, files in os.walk(start_dir):
        if filename in files:
            return os.path.join(root, filename)
    return None

pdf_path = find_pdf(os.path.abspath(os.path.join(os.getcwd(), '..')))
if pdf_path:
    with open(pdf_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        with open("pdf_content.txt", "w", encoding="utf-8") as out:
            out.write(text)
        print("Wrote to pdf_content.txt")
else:
    print("Could not find chetan work.pdf in parent directories.")
