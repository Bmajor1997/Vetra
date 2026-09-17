import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { create_completed_docx, extract_document } from "./src/document-io.js";
import { local_help_answer, VETRA_HELP_CONTEXT } from "./src/help.js";
const root = fileURLToPath(new URL(".", import.meta.url));
const MAX_DOCUMENT_BYTES = 25_000_000;
const public_files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/accessibility.css", ["accessibility.css", "text/css; charset=utf-8"]],
  ["/src/app.js", ["src/app.js", "text/javascript; charset=utf-8"]],
  ["/src/model.js", ["src/model.js", "text/javascript; charset=utf-8"]],
  ["/assets/vetra-mark.png", ["assets/vetra-mark.png", "image/png"]],
]);
const security_headers = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'none'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export class HttpError extends Error {
  constructor(status, message, headers = {}) { super(message); this.status = status; this.headers = headers; }
}

function positive_integer(name, fallback, minimum = 1, env = process.env) {
  if (env[name] == null || env[name] === "") return fallback;
  const value = Number(env[name]);
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`${name} must be an integer of at least ${minimum}.`);
  return value;
}
export function load_server_config(env = process.env) {
  return {
    body_timeout_ms: positive_integer("VETRA_BODY_TIMEOUT_MS", 15_000, 100, env),
    ai_timeout_ms: positive_integer("VETRA_AI_TIMEOUT_MS", 12_000, 100, env),
    extract_concurrency: positive_integer("VETRA_EXTRACT_CONCURRENCY", 2, 1, env),
    rate_window_ms: positive_integer("VETRA_RATE_WINDOW_MS", 60_000, 1_000, env),
    general_rate_limit: positive_integer("VETRA_RATE_LIMIT", 120, 1, env),
    extract_rate_limit: positive_integer("VETRA_EXTRACT_RATE_LIMIT", 10, 1, env),
    help_rate_limit: positive_integer("VETRA_HELP_RATE_LIMIT", 20, 1, env),
    max_document_bytes: positive_integer("VETRA_MAX_DOCUMENT_BYTES", MAX_DOCUMENT_BYTES, 1, env),
  };
}

export function create_vetra_handler(options = {}) {
 const env = options.env || process.env, config = { ...load_server_config(env), ...options.config };
 const hits = new Map(), fetch_impl = options.fetchImpl || fetch, logger = options.logger || console;
 const authorize = options.authorize || (() => true);
 let active_extractions = 0;
 const rate_limit = (key, limit) => {
   const now = Date.now(), prior = hits.get(key), entry = !prior || now >= prior.reset ? { count: 0, reset: now + config.rate_window_ms } : prior;
   entry.count += 1; hits.set(key, entry);
   if (entry.count > limit) throw new HttpError(429, "Too many requests. Please try again shortly.", { "Retry-After": String(Math.max(1, Math.ceil((entry.reset - now) / 1000))) });
 };
 return async (request, response) => {
  set_security_headers(response);
  try {
   const path = safe_request_path(request), client = request.socket.remoteAddress || "unknown";
   rate_limit(`${client}:all`, config.general_rate_limit);
   if (!authorize(request, path)) throw new HttpError(401, "Authentication is required.");
   if (path.startsWith("/api/") && request.method !== "POST") throw new HttpError(405, "Method not allowed.", { Allow: "POST" });
   if (request.method === "POST" && path === "/api/extract") {
    rate_limit(`${client}:extract`, config.extract_rate_limit);
    require_content_type(request, "application/octet-stream");
    if (active_extractions >= config.extract_concurrency) throw new HttpError(429, "Document processing is busy. Please try again shortly.", { "Retry-After": "2" });
    const name = safe_filename(request), body = await read_body(request, config.max_document_bytes, config.body_timeout_ms);
    if (!body.length) throw new HttpError(400, "The uploaded document is empty.");
    if (!valid_signature(name, body)) throw new HttpError(415, "The document contents do not match its filename.");
    active_extractions += 1;
    try {
      const result = await (options.extractDocument || extract_document)(name, body);
      send_json(response, 200, { text: result });
    } catch (error) { throw new HttpError(400, extraction_error_message(error)); }
    finally { active_extractions -= 1; }
    return;
  }
   if (request.method === "POST" && path === "/api/export-docx") {
    const payload = await read_json_body(request, 2_000_000, config.body_timeout_ms);
    if (!Array.isArray(payload.blocks) || !payload.blocks.length) throw new HttpError(400, "The worksheet does not contain anything to export.");
    const body = await (options.createDocx || create_completed_docx)(payload.title, payload.blocks);
    set_security_headers(response, { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Length": body.length });
    response.writeHead(200).end(body);
    return;
  }
   if (request.method === "POST" && path === "/api/help") {
      rate_limit(`${client}:help`, config.help_rate_limit);
      const { question } = await read_json_body(request, 20_000, config.body_timeout_ms);
      if (typeof question !== "string" || !question.trim() || question.length > 1000) throw new HttpError(400, "Type a shorter question about using Vetra.");
      let answer = local_help_answer(question), mode = "built-in";
      if (env.OPENAI_API_KEY) { try { answer = await answer_with_ai(question, { env, fetch_impl, timeout_ms: config.ai_timeout_ms }); mode = "ai"; } catch { logger.warn?.("Vetra AI help unavailable; using built-in guidance"); } }
      send_json(response, 200, { answer, mode });
    return;
  }
   if (path.startsWith("/api/")) throw new HttpError(404, "Not found.");
   if (!["GET", "HEAD"].includes(request.method)) throw new HttpError(405, "Method not allowed.", { Allow: "GET, HEAD" });
   const public_file = public_files.get(path);
   if (!public_file) throw new HttpError(404, "Not found.");
   const [relative, type] = public_file, body = await (options.readPublicFile || readFile)(resolve(root, relative));
   set_security_headers(response, { "Content-Type": type, "Content-Length": body.length, "Cache-Control": path === "/" || path === "/index.html" ? "no-cache" : "public, max-age=3600" });
   response.writeHead(200).end(request.method === "HEAD" ? undefined : body);
  } catch (error) { send_error(response, error, logger); }
 };
}
export function create_vetra_server(options = {}) { return createServer(create_vetra_handler(options)); }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const port = positive_integer("PORT", 4173);
 create_vetra_server().listen(port, () => console.log(`Vetra is ready at http://localhost:${port}`));
}

async function read_body(request, limit, timeout_ms) {
  const chunks = []; let size = 0, timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new HttpError(408, "The request body took too long to upload.")), timeout_ms); });
  const reading = (async () => { for await (const chunk of request) { size += chunk.length; if (size > limit) throw new HttpError(413, "The request body is too large."); chunks.push(chunk); } return Buffer.concat(chunks); })();
  try { return await Promise.race([reading, timeout]); } finally { clearTimeout(timer); }
}
async function read_json_body(request, limit, timeout_ms) {
  require_content_type(request, "application/json");
  const body = await read_body(request, limit, timeout_ms);
  try { return JSON.parse(body.toString("utf8")); }
  catch { throw new HttpError(400, "Vetra received invalid JSON."); }
}
function safe_request_path(request) { try { return decodeURIComponent(new URL(request.url, "http://localhost").pathname); } catch { throw new HttpError(400, "The request URL is malformed."); } }
function set_security_headers(response, extra = {}) { for (const [key, value] of Object.entries({ ...security_headers, ...extra })) response.setHeader(key, value); }
function send_json(response, status, body, headers = {}) { set_security_headers(response, { "Content-Type": "application/json; charset=utf-8", ...headers }); response.writeHead(status).end(JSON.stringify(body)); }
function send_error(response, error, logger) { const known = error instanceof HttpError; if (!known) logger.error?.("Unexpected Vetra request failure", { name: error?.name }); send_json(response, known ? error.status : 500, { error: known ? error.message : "Vetra could not complete that request." }, known ? error.headers : {}); }
function require_content_type(request, expected) { const actual = String(request.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase(); if (actual !== expected) throw new HttpError(415, `Content-Type must be ${expected}.`); }
function safe_filename(request) { const encoded = request.headers["x-vetra-filename"]; if (typeof encoded !== "string" || encoded.length > 1000) throw new HttpError(400, "A document filename is required."); let name; try { name = decodeURIComponent(encoded); } catch { throw new HttpError(400, "The document filename is malformed."); } name = name.split(/[\\/]/).at(-1); if (!name || !/\.(pdf|docx)$/i.test(name)) throw new HttpError(415, "Choose a PDF or DOCX document."); return name; }
function valid_signature(name, body) { if (/\.pdf$/i.test(name)) return body.subarray(0, 5).toString("ascii") === "%PDF-"; if (/\.docx$/i.test(name)) return body.length >= 4 && body[0] === 0x50 && body[1] === 0x4b && [3, 5, 7].includes(body[2]) && [4, 6, 8].includes(body[3]); return false; }
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
async function answer_with_ai(question, { env, fetch_impl, timeout_ms }) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout_ms);
  try { const apiResponse = await fetch_impl("https://api.openai.com/v1/responses", { method: "POST", signal: controller.signal, headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: env.OPENAI_MODEL || "gpt-5.4-mini", instructions: VETRA_HELP_CONTEXT, input: question.trim(), max_output_tokens: 300 }) }); if (!apiResponse.ok) throw new Error("AI unavailable"); const result = await apiResponse.json(); return result.output_text?.trim() || local_help_answer(question); }
  finally { clearTimeout(timer); }
}
