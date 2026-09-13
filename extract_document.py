"""Extract local PDF/DOCX content into heading-aware plain text."""
from pathlib import Path
import sys


def extract_pdf(path: Path) -> str:
    from pypdf import PdfReader

    pages = [page.extract_text(extraction_mode="layout") or "" for page in PdfReader(path).pages]
    text = "\n\n".join(page.strip() for page in pages if page.strip())
    if not text:
        raise ValueError("This PDF has no selectable text. Scanned PDFs need OCR, which is not included yet.")
    return text


def extract_docx(path: Path) -> str:
    from docx import Document

    output = []
    for paragraph in Document(path).paragraphs:
        text = paragraph.text.strip()
        if not text:
            output.append("")
            continue
        style = (paragraph.style.name or "").lower()
        if style.startswith("title"):
            output.append(f"# {text}")
        elif style.startswith("heading"):
            digits = "".join(char for char in style if char.isdigit())
            level = min(6, max(2, int(digits or 2)))
            output.append(f"{'#' * level} {text}")
        elif "list" in style:
            output.append(f"• {text}")
        else:
            output.append(text)
    text = "\n".join(output).strip()
    if not text:
        raise ValueError("This DOCX document does not contain readable paragraphs.")
    return text


def main() -> None:
    path = Path(sys.argv[1])
    if path.suffix.lower() == ".pdf":
        text = extract_pdf(path)
    elif path.suffix.lower() == ".docx":
        text = extract_docx(path)
    else:
        raise ValueError("Unsupported document type.")
    sys.stdout.reconfigure(encoding="utf-8")
    print(text)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
