import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(root, 'public');
const dataFile = process.env.DATA_FILE ? join(root, process.env.DATA_FILE.replace(/^\.\//, '')) : join(root, 'data/transactions.json');
const port = Number(process.env.PORT || 3010);
const categories = ['Oziq-ovqat', 'Transport', 'Uy-joy', 'Sog‘liq', 'Ta’lim', 'Ko‘ngilochar', 'Maosh', 'Boshqa'];

async function readItems() { try { return JSON.parse(await readFile(dataFile, 'utf8')); } catch { return []; } }
async function saveItems(items) { await writeFile(dataFile, JSON.stringify(items, null, 2)); }
function send(res, status, body, type = 'application/json; charset=utf-8') { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); }
function parseBody(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => raw += chunk); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('JSON noto‘g‘ri')); } }); }); }
function summary(items) {
  const income = items.filter(x => x.type === 'income').reduce((a, x) => a + x.amount, 0);
  const expense = items.filter(x => x.type === 'expense').reduce((a, x) => a + x.amount, 0);
  const byCategory = items.filter(x => x.type === 'expense').reduce((acc, x) => { acc[x.category] = (acc[x.category] || 0) + x.amount; return acc; }, {});
  return { income, expense, balance: income - expense, count: items.length, byCategory };
}
async function api(req, res, url) {
  const items = await readItems();
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, service: 'kunhisob' });
  if (req.method === 'GET' && url.pathname === '/api/categories') return send(res, 200, categories);
  if (req.method === 'GET' && url.pathname === '/api/summary') return send(res, 200, summary(items));
  if (req.method === 'GET' && url.pathname === '/api/transactions') {
    const month = url.searchParams.get('month');
    const filtered = month ? items.filter(x => x.date.startsWith(month)) : items;
    return send(res, 200, filtered.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt));
  }
  if (req.method === 'POST' && url.pathname === '/api/transactions') {
    const body = await parseBody(req);
    const amount = Number(body.amount);
    if (!body.title?.trim() || !Number.isFinite(amount) || amount <= 0 || !['income', 'expense'].includes(body.type) || !body.date) return send(res, 400, { error: 'Nomi, summa, turi va sana to‘g‘ri kiritilishi kerak.' });
    const item = { id: crypto.randomUUID(), title: body.title.trim().slice(0, 100), amount: Math.round(amount * 100) / 100, type: body.type, category: body.category || 'Boshqa', date: body.date, note: (body.note || '').trim().slice(0, 300), createdAt: Date.now() };
    items.push(item); await saveItems(items); return send(res, 201, item);
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/api/transactions/')) {
    const id = url.pathname.split('/').pop(); const next = items.filter(x => x.id !== id); if (next.length === items.length) return send(res, 404, { error: 'Tranzaksiya topilmadi' });
    await saveItems(next); return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: 'API route topilmadi' });
}
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try { const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    const requested = url.pathname === '/' ? '/index.html' : url.pathname; const file = normalize(join(publicDir, requested)); if (!file.startsWith(publicDir) || !existsSync(file)) return send(res, 404, 'Topilmadi', 'text/plain; charset=utf-8');
    return send(res, 200, await readFile(file), mime[extname(file)] || 'application/octet-stream');
  } catch (error) { console.error(error); send(res, 500, { error: 'Server xatosi' }); }
});
server.listen(port, '0.0.0.0', () => console.log(`KunHisob ${port}-portda ishlayapti`));
