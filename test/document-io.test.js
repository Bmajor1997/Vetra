import test from "node:test";
import assert from "node:assert/strict";
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow } from "docx";
import { create_completed_docx, extract_document, html_to_document_text } from "../src/document-io.js";

test("preserves headings and table cells from Word conversion", () => {
  const text = html_to_document_text("<h1>Plan</h1><h2>Checks</h2><table><tr><td>☐ Ready</td><td>__________</td></tr></table>");
  assert.match(text, /^# Plan/);
  assert.match(text, /## Checks/);
  assert.match(text, /☐ Ready\s+\|\s+__________/);
});

test("extracts headings, worksheet marks, and table content from a Word document", async () => {
  const source = new Document({ sections: [{ children: [
    new Paragraph({ text: "Worksheet", heading: HeadingLevel.TITLE }),
    new Paragraph({ text: "Tasks", heading: HeadingLevel.HEADING_1 }),
    new Table({ rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph("☐ Ready")] }), new TableCell({ children: [new Paragraph("__________")] })] })] }),
  ] }] });
  const text = await extract_document("worksheet.docx", await Packer.toBuffer(source));
  assert.match(text, /# Worksheet/);
  assert.match(text, /## Tasks/);
  assert.match(text, /☐ Ready/);
  assert.match(text, /__________/);
});

test("creates a valid completed Word worksheet", async () => {
  const buffer = await create_completed_docx("Completed Plan", "Tasks\n\n[x] Approved.\n\nWhy?\nBecause it is ready.");
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  const extracted = await extract_document("completed.docx", buffer);
  assert.match(extracted, /Completed Plan/);
  assert.match(extracted, /Because it is ready/);
});
