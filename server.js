import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
const port = Number(process.env.PORT || 4173);
const root = new URL(".", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/extract") {
    try {
      const chunks = []; let size = 0;
      for await (const chunk of request) { size += chunk.length; if (size > 35_000_000) throw new Error("Document is too large. The current limit is 25 MB."); chunks.push(chunk); }
      const { name, data } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!name || !data || !/\.(pdf|docx)$/i.test(name)) throw new Error("Choose a PDF or DOCX document.");
      const temp = await mkdtemp(join(tmpdir(), "recall-document-"));
      try {
        const input = join(temp, `input${extname(name).toLowerCase()}`); await writeFile(input, Buffer.from(data, "base64"));
        const result = await run_extractor(input);
        response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ text: result }));
      } finally { await rm(temp, { recursive: true, force: true }); }
    } catch (error) { response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: error.message })); }
    return;
  }
  const requested = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const path = normalize(join(root, requested));
  if (!path.startsWith(normalize(root))) { response.writeHead(403).end("Forbidden"); return; }
  try { const body = await readFile(path); response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" }); response.end(body); }
  catch { response.writeHead(404).end("Not found"); }
}).listen(port, () => console.log(`Recall is ready at http://localhost:${port}`));

function run_extractor(input) {
  const python = process.env.PYTHON_EXECUTABLE || "python";
  return new Promise((resolve, reject) => {
    const child = spawn(python, [join(root, "extract_document.py"), input], { windowsHide: true }); let output = "", errors = "";
    child.stdout.on("data", (chunk) => output += chunk); child.stderr.on("data", (chunk) => errors += chunk);
    child.on("error", () => reject(new Error("Python is required for PDF and DOCX extraction.")));
    child.on("close", (code) => code === 0 ? resolve(output) : reject(new Error(errors.trim() || "The document could not be read.")));
  });
}
