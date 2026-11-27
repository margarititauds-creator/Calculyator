const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, 'public_html');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.ttf':'font/ttf','.json':'application/json'};
http.createServer((req,res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname.startsWith('/api/')) {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ready:false,cloudDeliveryEnabled:false}));
    return;
  }
  const file = path.resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403);res.end();return;}
  fs.readFile(file, (err,data) => {
    if (err) {res.writeHead(404);res.end();return;}
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
    res.end(path.extname(file) === '.html' ? data.toString('utf8').replace('</head>', '<style>html{scroll-behavior:auto!important}</style></head>') : data);
  });
}).listen(8128, '127.0.0.1', () => console.log('Local review: http://127.0.0.1:8128 — delivery disabled'));
