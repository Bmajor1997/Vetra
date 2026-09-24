import test from "node:test";
import assert from "node:assert/strict";
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow } from "docx";
import { clean_extracted_text, extract_document, html_to_document_text, reconstruct_pdf_page_text } from "../app_parts/document_file_tools.js";

test("preserves headings and table cells from Word conversion", () => {
  const text = html_to_document_text("<h1>Plan</h1><h2>Checks</h2><table><tr><td>☐ Ready</td><td>__________</td></tr></table>");
  assert.match(text, /^# Plan/);
  assert.match(text, /## Checks/);
  assert.match(text, /☐ Ready\s+\|\s+__________/);
});

test("preserves ordered and bulleted Word list meaning", () => {
  const text = html_to_document_text("<ol><li>First task</li><li>Second task</li></ol><ul><li>Supporting note</li></ul>");
  assert.match(text, /1\. First task/);
  assert.match(text, /2\. Second task/);
  assert.match(text, /• Supporting note/);
});

test("cleans repeated PDF furniture, page numbers, ligatures, and broken words", () => {
  const extracted = [
    "CONFIDENTIAL REPORT\nIntro text about acces-\nsibility and efficient work.\nPage 1 of 3",
    "CONFIDENTIAL REPORT\nMiddle text with a ﬁnal recommendation.\nPage 2 of 3",
    "CONFIDENTIAL REPORT\nConclusion text.\nPage 3 of 3",
  ].join("\f");
  const cleaned = clean_extracted_text(extracted, { removeRepeatedPageArtifacts: true });
  assert.doesNotMatch(cleaned, /CONFIDENTIAL REPORT/);
  assert.doesNotMatch(cleaned, /Page \d/);
  assert.match(cleaned, /accessibility/);
  assert.match(cleaned, /final recommendation/);
});

test("reconstructs PDF lines by visual position instead of internal object order", () => {
  const item = (str, x, y, width, height = 12) => ({ str, transform: [1, 0, 0, height, x, y], width, height, dir: "ltr" });
  const text = reconstruct_pdf_page_text([
    item("________________", 155, 650, 210),
    item("Version:", 74, 620, 70),
    item("Owner:", 74, 650, 60),
    item("________________", 155, 620, 210),
    item("Project Name:", 74, 680, 110),
    item("________________", 195, 680, 170),
  ]);
  assert.equal(text, [
    "Project Name: ________________",
    "Owner: ________________",
    "Version: ________________",
  ].join("\n"));
  assert.doesNotMatch(text, /^_+\s+(?:Owner|Version):/m);
});

test("extracts headings, symbols, and table content from a Word document", async () => {
  const source = new Document({ sections: [{ children: [
    new Paragraph({ text: "Document", heading: HeadingLevel.TITLE }),
    new Paragraph({ text: "Tasks", heading: HeadingLevel.HEADING_1 }),
    new Table({ rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph("☐ Ready")] }), new TableCell({ children: [new Paragraph("__________")] })] })] }),
  ] }] });
  const text = await extract_document("document.docx", await Packer.toBuffer(source));
  assert.match(text, /# Document/);
  assert.match(text, /## Tasks/);
  assert.match(text, /☐ Ready/);
  assert.match(text, /__________/);
});

