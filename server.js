const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 8790);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function cleanQuery(value) {
  return String(value || '').replace(/[^\p{L}\p{N}\s.\-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function extractLowestPrice(html) {
  const prices = [...html.matchAll(/(?:Price\s*)?€\s*([0-9]+(?:[,.][0-9]{1,2})?)/gi)]
    .map(match => Number(match[1].replace(',', '.')))
    .filter(value => Number.isFinite(value) && value > 0 && value < 2000);
  if (!prices.length) return null;
  return Math.min(...prices);
}

async function fetchPrice(provider, query) {
  const encoded = encodeURIComponent(query);
  const url = provider === 'atomx'
    ? `https://www.atomxsupply.com/en/search?controller=search&s=${encoded}`
    : `https://www.vegatattoosupplies.com/buscar?controller=search&s=${encoded}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 EstudioStock/1.0',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });
  const html = await response.text();
  return { provider, url, price: extractLowestPrice(html) };
}

async function handleApi(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const query = cleanQuery(requestUrl.searchParams.get('q'));
  if (!query) return send(res, 400, JSON.stringify({ error: 'missing query' }), 'application/json; charset=utf-8');

  try {
    const [atomx, vega] = await Promise.allSettled([
      fetchPrice('atomx', query),
      fetchPrice('vega', query)
    ]);
    const result = {
      query,
      atomx: atomx.status === 'fulfilled' ? atomx.value : { provider: 'atomx', price: null },
      vega: vega.status === 'fulfilled' ? vega.value : { provider: 'vega', price: null }
    };
    send(res, 200, JSON.stringify(result), 'application/json; charset=utf-8');
  } catch (error) {
    send(res, 500, JSON.stringify({ error: 'price lookup failed' }), 'application/json; charset=utf-8');
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/provider-prices')) {
    handleApi(req, res);
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const safePath = path.normalize(decodeURIComponent(requestUrl.pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(root, safePath === '/' ? 'index.html' : safePath);
  if (!filePath.startsWith(root)) return send(res, 403, 'Forbidden');

  fs.readFile(filePath, (error, data) => {
    if (error) return send(res, 404, 'Not found');
    send(res, 200, data, types[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Estudio Stock con precios: http://localhost:${port}`);
});
