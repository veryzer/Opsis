const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const COUNTER_FILE = path.join(ROOT, 'visits.json');
const PLAIN_COUNTER_FILE = path.join(ROOT, 'counter.txt');

function readCount() {
  try {
    const raw = fs.readFileSync(COUNTER_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const count = Number(parsed.count || 0);
    return Number.isFinite(count) ? count : 0;
  } catch {
    return 0;
  }
}

function writeCount(value) {
  const safeValue = Number(value) || 0;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count: safeValue }, null, 2));
  fs.writeFileSync(PLAIN_COUNTER_FILE, String(safeValue));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(reqUrl, res) {
  const rawPath = reqUrl === '/' ? '/index.html' : reqUrl;
  const safePath = path.normalize(rawPath).replace(/^\.+/, '');
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain; charset=utf-8'
    };

    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/track-visit') {
    const nextCount = readCount() + 1;
    writeCount(nextCount);
    sendJson(res, 200, { count: nextCount });
    return;
  }

  if (url.pathname === '/count' || url.pathname === '/visits.json') {
    sendJson(res, 200, { count: readCount() });
    return;
  }

  if (url.pathname === '/counter.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(readCount()));
    return;
  }

  serveStaticFile(url.pathname, res);
});

if (!fs.existsSync(COUNTER_FILE)) {
  writeCount(0);
}

server.listen(PORT, () => {
  console.log(`Opsis counter is running at http://localhost:${PORT}`);
});
