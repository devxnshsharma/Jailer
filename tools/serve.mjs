import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const rootFlag = process.argv.indexOf('--root');
const root = rootFlag >= 0 && process.argv[rootFlag + 1]
  ? join(projectRoot, process.argv[rootFlag + 1])
  : projectRoot;
const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function safePath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, 'http://localhost').pathname);
  const candidate = normalize(join(root, pathname === '/' ? 'index.html' : pathname.slice(1)));
  if (candidate !== root && !candidate.startsWith(rootPrefix)) return null;
  return candidate;
}

const server = createServer(async (request, response) => {
  try {
    const path = safePath(request.url || '/');
    if (!path) { response.writeHead(403); response.end('Forbidden'); return; }
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Mass Metro raw web runtime: http://localhost:${port}/`);
});
