import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { create_completed_docx, extract_document } from "./src/document-io.js";
import { local_help_answer, VETRA_HELP_CONTEXT } from "./src/help.js";
const port = Number(process.env.PORT || 4173);
const root = new URL(".", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/extract") {
    try {
      const { name, data } = await read_json_body(request, 35_000_000, "Document is too large. The current limit is 25 MB.");
      if (!name || !data || !/\.(pdf|docx)$/i.test(name)) throw new Error("Choose a PDF or DOCX document.");
      const result = await extract_document(name, Buffer.from(data, "base64"));
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ text: result }));
    } catch (error) { send_error(response, extraction_error_message(error)); }
    return;
  }
  if (request.method === "POST" && request.url === "/api/export-docx") {
    try {
      const payload = await read_json_body(request, 2_000_000, "The completed worksheet is too large to export.");
      if (typeof payload.content !== "string" || !payload.content.trim()) throw new Error("The worksheet does not contain anything to export.");
      const body = await create_completed_docx(payload.title, payload.content);
      response.writeHead(200, { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Length": body.length }).end(body);
    } catch (error) { send_error(response, export_error_message(error)); }
    return;
  }
  if (request.method === "POST" && request.url === "/api/help") {
    try {
      const { question } = await read_json_body(request, 20_000, "That question is too long. Please shorten it and try again.");
      if (typeof question !== "string" || !question.trim()) throw new Error("Type a question about using Vetra.");
      let answer = local_help_answer(question), mode = "built-in";
      if (process.env.OPENAI_API_KEY) { try { answer = await answer_with_ai(question); mode = "ai"; } catch { /* Built-in guidance keeps help available if AI is unavailable. */ } }
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ answer, mode }));
    } catch (error) { send_error(response, String(error?.message || "Vetra Help could not answer right now.")); }
    return;
  }
  const requested = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const path = normalize(join(root, requested));
  if (!path.startsWith(normalize(root))) { response.writeHead(403).end("Forbidden"); return; }
  try { const body = await readFile(path); response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" }); response.end(body); }
  catch { response.writeHead(404).end("Not found"); }
}).listen(port, () => console.log(`Vetra is ready at http://localhost:${port}`));

async function read_json_body(request, limit, limitMessage) {
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > limit) throw new Error(limitMessage); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("Vetra received an invalid document request. Please choose the file again."); }
}
function send_error(response, message) { response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: message })); }
function extraction_error_message(error) {
  const message = String(error?.message || error);
  if (/password|encrypted/i.test(message)) return "This document is password-protected. Remove the password and upload it again.";
  if (/no selectable text|scanned/i.test(message)) return "Vetra could not find selectable text in this PDF. It may be a scanned document; scanned-PDF reading is not supported yet.";
  if (/not a zip|package not found|file is not a zip|eof marker|malformed|invalid pdf/i.test(message)) return "This file appears to be damaged or is not a valid PDF or Word document. Try opening and saving it again, then re-upload it.";
  return message || "Vetra could not read this document. Try saving a fresh copy or uploading a TXT version.";
}
function export_error_message(error) {
  const message = String(error?.message || error);
  return message || "Vetra could not create the Word document. Please try the text download instead.";
}
async function answer_with_ai(question) {
  const apiResponse = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.4-mini", instructions: VETRA_HELP_CONTEXT, input: question.trim(), max_output_tokens: 300 }) });
  const result = await apiResponse.json();
  if (!apiResponse.ok) throw new Error("The AI help service is unavailable. Please try again later.");
  return result.output_text?.trim() || local_help_answer(question);
}
