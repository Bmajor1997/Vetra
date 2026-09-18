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
    const text = clean_extracted_text(html_to_document_text(result.value));
    if (!text.trim()) throw new Error("This Word document does not contain readable text.");
    return text;
  }
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    if (!result.text.trim()) throw new Error("This PDF has no selectable text. Scanned PDFs need OCR, which is not included yet.");
    return clean_extracted_text(result.text, { removeRepeatedPageArtifacts: true });
  } finally { await parser.destroy(); }
}

export function html_to_document_text(html) {
  const with_ordered_lists = html.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_list, items) => {
    let number = 0;
    return items.replace(/<li[^>]*>(.*?)<\/li>/gis, (_item, content) => `${++number}. ${content}\n`);
  });
  return decode_html(with_ordered_lists
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

export function clean_extracted_text(source, { removeRepeatedPageArtifacts = false } = {}) {
  let text = String(source || "").replace(/\r\n?/g, "\n").replace(/[\uFB00-\uFB06]/g, (character) => ({ "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st" })[character] || character);
  let pages = text.split(/\f|\n\s*---\s*PAGE\s+\d+\s*---\s*\n/gi);
  if (removeRepeatedPageArtifacts && pages.length >= 3) {
    const candidates = new Map();
    for (const page of pages) {
      const lines = page.split("\n").map((line) => line.trim()).filter(Boolean);
      for (const line of [lines[0], lines.at(-1)]) if (line && !is_page_number(line)) candidates.set(normalize_artifact(line), (candidates.get(normalize_artifact(line)) || 0) + 1);
    }
    const repeated = new Set([...candidates].filter(([, count]) => count >= Math.ceil(pages.length * .6)).map(([line]) => line));
    pages = pages.map((page) => page.split("\n").filter((line) => !repeated.has(normalize_artifact(line))).join("\n"));
  }
  text = pages.join("\n\n")
    .replace(/^\s*(?:page\s+)?\d+(?:\s+of\s+\d+)?\s*$/gim, "")
    .replace(/([A-Za-z])-[ \t]*\n[ \t]*([a-z])/g, "$1$2")
    .replace(/^\s*[•◦▪●]\s*/gm, "• ")
    .replace(/^\s*(\d+)[)]\s+/gm, "$1. ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

function normalize_artifact(line) { return line.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim(); }
function is_page_number(line) { return /^(?:page\s+)?\d+(?:\s+of\s+\d+)?$/i.test(line.trim()); }

function decode_html(text) {
  return text.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
    if (entity[0] === "#") return String.fromCodePoint(parseInt(entity.slice(entity[1]?.toLowerCase() === "x" ? 2 : 1), entity[1]?.toLowerCase() === "x" ? 16 : 10));
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[entity.toLowerCase()];
  });
}

export async function create_completed_docx(title, blocks) {
  const safeTitle = String(title || "Completed worksheet").slice(0, 300);
  const children = [new Paragraph({ text: safeTitle, heading: HeadingLevel.TITLE })];
  for (const block of blocks) {
    if (!block || !["heading", "paragraph"].includes(block.type) || typeof block.text !== "string") continue;
    const text = block.text.trim().slice(0, 100_000);
    if (!text) continue;
    children.push(new Paragraph(block.type === "heading" ? { text, heading: HeadingLevel.HEADING_1 } : { text }));
  }
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}
