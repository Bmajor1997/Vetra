import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { Document, HeadingLevel, Packer, Paragraph } from "docx";

export async function extract_document(name, buffer) {
  if (/\.docx$/i.test(name)) {
    const result = await mammoth.convertToHtml({ buffer }, { styleMap: [
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Heading 1'] => h2:fresh",
      "p[style-name='Heading 2'] => h3:fresh",
      "p[style-name='Heading 3'] => h4:fresh",
      "p[style-name='Heading 4'] => h5:fresh",
      "p[style-name='Heading 5'] => h6:fresh",
    ] });
    const text = html_to_document_text(result.value);
    if (!text.trim()) throw new Error("This Word document does not contain readable text.");
    return text;
  }
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    if (!result.text.trim()) throw new Error("This PDF has no selectable text. Scanned PDFs need OCR, which is not included yet.");
    return result.text;
  } finally { await parser.destroy(); }
}

export function html_to_document_text(html) {
  return decode_html(html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gis, "# $1\n\n")
    .replace(/<h[2-6][^>]*>(.*?)<\/h[2-6]>/gis, "## $1\n\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gis, "• $1\n")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<\/(tr|p|table)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+\|[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decode_html(text) {
  return text.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
    if (entity[0] === "#") return String.fromCodePoint(parseInt(entity.slice(entity[1]?.toLowerCase() === "x" ? 2 : 1), entity[1]?.toLowerCase() === "x" ? 16 : 10));
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[entity.toLowerCase()];
  });
}

export async function create_completed_docx(title, content) {
  const safeTitle = String(title || "Completed worksheet").slice(0, 300);
  const children = [new Paragraph({ text: safeTitle, heading: HeadingLevel.TITLE })];
  for (const block of content.split("\n\n")) {
    const text = block.trim();
    if (!text || text === "---") continue;
    const isHeading = !text.includes("\n") && text.length < 120 && !text.startsWith("[");
    children.push(new Paragraph(isHeading ? { text, heading: HeadingLevel.HEADING_1 } : { text }));
  }
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}
