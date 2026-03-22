import pdfplumber

def extract_pdf(file_path):
    pages = []

    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            pages.append({
                "page": i + 1,
                "text": page.extract_text(),
                "tables": page.extract_tables()
            })

    return pages