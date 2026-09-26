import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

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
    const document = await parser.load();
    const pages = [];
    for (let page_number = 1; page_number <= document.numPages; page_number++) {
      const page = await document.getPage(page_number);
      try {
        const content = await page.getTextContent({ includeMarkedContent: false, disableNormalization: false });
        pages.push(reconstruct_pdf_page_text(content.items));
      } finally { page.cleanup(); }
    }
    const text = pages.join("\f");
    if (!text.trim()) throw new Error("This PDF has no selectable text. Scanned PDFs need OCR, which is not included yet.");
    return clean_extracted_text(text, { removeRepeatedPageArtifacts: true });
  } finally { await parser.destroy(); }
}

export function reconstruct_pdf_page_text(items) {
  const fragments = items
    .filter((item) => item && typeof item.str === "string" && item.str.trim() && Array.isArray(item.transform) && item.transform.length >= 6)
    .map((item) => ({
      text: item.str.trim(),
      x: Number(item.transform[4]) || 0,
      y: Number(item.transform[5]) || 0,
      width: Math.max(0, Number(item.width) || 0),
      height: Math.max(1, Math.abs(Number(item.height) || Number(item.transform[3]) || 1)),
      direction: item.dir === "rtl" ? "rtl" : "ltr",
    }))
    .sort((left, right) => right.y - left.y || left.x - right.x);
  if (!fragments.length) return "";

  const lines = [];
  for (const fragment of fragments) {
    const line = lines.find((candidate) => Math.abs(candidate.y - fragment.y) <= Math.max(2, Math.min(candidate.height, fragment.height) * .45));
    if (line) {
      line.fragments.push(fragment);
      const count = line.fragments.length;
      line.y = ((line.y * (count - 1)) + fragment.y) / count;
      line.height = Math.max(line.height, fragment.height);
    } else lines.push({ y: fragment.y, height: fragment.height, fragments: [fragment] });
  }

  lines.sort((left, right) => right.y - left.y);
  return lines.map((line, index) => {
    const rtl = line.fragments.filter((fragment) => fragment.direction === "rtl").length > line.fragments.length / 2;
    line.fragments.sort((left, right) => rtl ? right.x - left.x : left.x - right.x);
    const text = join_pdf_line_fragments(line.fragments, rtl);
    const next = lines[index + 1];
    const has_paragraph_gap = next && line.y - next.y > Math.max(line.height, next.height) * 3;
    return text + (has_paragraph_gap ? "\n" : "");
  }).join("\n");
}

function join_pdf_line_fragments(fragments, rtl) {
  let output = "", previous = null;
  for (const fragment of fragments) {
    if (previous) {
      const previous_edge = rtl ? previous.x : previous.x + previous.width;
      const gap = rtl ? previous_edge - (fragment.x + fragment.width) : fragment.x - previous_edge;
      const average_character_width = previous.text.length ? previous.width / previous.text.length : 0;
      if (!/\s$/.test(output) && !/^\s/.test(fragment.text) && gap > Math.max(1.5, average_character_width * .2)) output += " ";
    }
    output += fragment.text;
    previous = fragment;
  }
  return output.trim();
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
  text = pages.join("\n\n");
  const lines = text.split("\n");
  const firstReadable = lines.findIndex((line, index) => index >= 80 || !is_extraction_artifact(line));
  if (firstReadable > 0) text = lines.slice(firstReadable).join("\n");
  text = text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/^\s*(?:page\s+)?\d+(?:\s+of\s+\d+)?\s*$/gim, "")
    .replace(/([A-Za-z])-[ \t]*\n[ \t]*([a-z])/g, "$1$2")
    .replace(/^\s*[•◦▪●]\s*/gm, "• ")
    .replace(/^\s*(\d+)[)]\s+/gm, "$1. ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

function is_extraction_artifact(line) {
  const value = line.trim();
  if (!value) return true;
  return /^%PDF-\d(?:\.\d+)?/i.test(value)
    || /^\d+\s+\d+\s+obj\b/i.test(value)
    || /^(?:endobj|xref|trailer|startxref|%%EOF)\b/i.test(value)
    || /^<<\s*\/?(?:Type|Catalog|Pages|Page|Length|Filter|Root|Info|Size)\b/i.test(value)
    || /^\/?(?:Type|Catalog|Pages|Page|Length|Filter|Root|Info|Size)\s*\//i.test(value)
    || /^<\?xml\b[^>]*\?>$/i.test(value)
    || /^<!DOCTYPE\b[^>]*>$/i.test(value);
}
function normalize_artifact(line) { return line.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim(); }
function is_page_number(line) { return /^(?:page\s+)?\d+(?:\s+of\s+\d+)?$/i.test(line.trim()); }

function decode_html(text) {
  return text.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
    if (entity[0] === "#") return String.fromCodePoint(parseInt(entity.slice(entity[1]?.toLowerCase() === "x" ? 2 : 1), entity[1]?.toLowerCase() === "x" ? 16 : 10));
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[entity.toLowerCase()];
  });
}

