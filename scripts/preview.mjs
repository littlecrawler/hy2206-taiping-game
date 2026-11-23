import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/classic.html', 'classic.html'], ['/Taiping-Classroom.html', 'Taiping-Classroom.html']]);
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  const page = pages.get(new URL(request.url, 'http://localhost').pathname);
  if (!page) { response.writeHead(404).end('Not found'); return; }
  try {
    const body = await readFile(resolve(root, page));
    response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404).end('Run node scripts/build.mjs first.'); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(Number(process.argv[2]) || 8766, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:' + server.address().port));
