import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('./public/index.html', import.meta.url), 'utf8');
const js = await readFile(new URL('./server.js', import.meta.url), 'utf8');
assert.match(html, /KunHisob/); assert.match(html, /transactionForm/); assert.match(js, /\/api\/transactions/); assert.match(js, /summary/); console.log('4 ta smoke test muvaffaqiyatli');
