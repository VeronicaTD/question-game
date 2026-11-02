const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
};

function parseArgs(argv) {
  const opts = { port: 7100, host: '127.0.0.1', selftest: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--selftest') opts.selftest = true;
    else if (a === '--port' || a === '-p') opts.port = Number(argv[++i]);
    else if (a.startsWith('--port=')) opts.port = Number(a.split('=')[1]);
    else if (a === '--host') opts.host = argv[++i];
    else if (a.startsWith('--host=')) opts.host = a.split('=')[1];
  }
  return opts;
}

function createServer() {
  const root = __dirname;
  return http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(root, path.normalize(urlPath).replace(/^([/\\])+/, ''));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

const opts = parseArgs(process.argv);

if (opts.selftest) {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    http.get({ host: '127.0.0.1', port, path: '/' }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        console.log(`SELFTEST status=${res.statusCode} bytes=${body.length} title=${/<title>(.*?)<\/title>/.exec(body)?.[1] || 'none'}`);
        server.close(() => process.exit(res.statusCode === 200 && body.length > 1000 ? 0 : 1));
      });
    }).on('error', (e) => {
      console.error('SELFTEST failed:', e.message);
      server.close(() => process.exit(1));
    });
  });
} else {
  const server = createServer();
  server.listen(opts.port, opts.host, () => {
    console.log(`Question game running at http://${opts.host}:${opts.port}/`);
  });
}
