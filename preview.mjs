import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "dist");
const standalone = resolve(root, "..", "Taiping-Classroom.html");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg" };
const server = http.createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch { response.writeHead(400).end("Invalid path"); return; }
  const target = pathname === "/Taiping-Classroom.html" ? standalone : resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (target !== standalone && target !== root && !target.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try {
    if (!(await stat(target)).isFile()) throw new Error("Not a file");
    const body = await readFile(target);
    response.writeHead(200, { "Content-Type": mime[extname(target)] || "application/octet-stream", "Content-Length": body.length, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found"); }
});
server.on("error", (error) => { console.error(error.code === "EADDRINUSE" ? "Port 8766 is busy. You can open dist/index.html directly, or run: node preview.mjs 8767" : error.message); process.exitCode = 1; });
server.listen(Number(process.argv[2]) || 8766, "127.0.0.1", () => console.log("Local preview: http://127.0.0.1:" + server.address().port + "\nOpen dist/index.html directly for offline use. Press Ctrl+C to stop this preview."));
