/**
 * Cloudflare Pages Functions：/api/*
 * 和 chat-server.js / 云函数同一套接口，数据存在 KV 里。
 *
 * 路由：
 *   GET  /api/messages?room=live&since=0&clientId=xxx&role=viewer
 *   POST /api/send        { room, nick, text, clientId }
 *   GET  /api/products
 *   PUT  /api/products    （Bearer 管理令牌）
 *   GET  /api/layout
 *   PUT  /api/layout      （Bearer 管理令牌）
 *   GET  /api/health
 *
 * 需要的绑定：
 *   KV 命名空间  ZHIBO_KV
 *   环境变量     ADMIN_TOKEN
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

const MAX_TEXT = 120;
const MAX_NICK = 16;
const MAX_PRODUCTS = 200;
const KEEP_MESSAGES = 200;
const PRESENCE_TTL = 30;
const ALLOWED_MODULES = ['settings', 'link', 'goods', 'log'];

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS)
  });
}

function clean(str, max) {
  return String(str == null ? '' : str)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function normRoom(v) {
  const s = String(v == null ? '' : v).trim();
  return /^[A-Za-z0-9_-]{1,32}$/.test(s) ? s : 'live';
}

function authed(request, env) {
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') || '');
  return !!m && m[1].trim() === (env.ADMIN_TOKEN || 'change-me');
}

function cleanOrder(list) {
  if (!Array.isArray(list)) return null;
  const out = [];
  list.forEach(id => {
    const s = String(id == null ? '' : id).trim();
    if (ALLOWED_MODULES.indexOf(s) >= 0 && out.indexOf(s) < 0) out.push(s);
  });
  return out;
}

function cleanProduct(p) {
  if (!p || typeof p !== 'object') return null;
  const title = clean(p.title, 60);
  if (!title) return null;
  const price = Number(p.price);
  if (!isFinite(price) || price < 0) return null;
  const out = {
    id: clean(p.id, 40) || crypto.randomUUID(),
    title,
    price: Math.round(price * 100) / 100,
    image: /^https?:\/\//i.test(String(p.image || '')) ? String(p.image).slice(0, 500) : '',
    tag: clean(p.tag, 12),
    url: /^https?:\/\//i.test(String(p.url || '')) ? String(p.url).slice(0, 500) : '',
    visible: p.visible !== false
  };
  if (p.original !== undefined && p.original !== '' && p.original !== null) {
    const o = Number(p.original);
    if (isFinite(o) && o >= 0) out.original = Math.round(o * 100) / 100;
  }
  return out;
}

async function readJson(kv, key, fallback) {
  const raw = await kv.get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch (e) { return fallback; }
}

async function handleMessages(kv, url) {
  const room = normRoom(url.searchParams.get('room'));
  const since = Number(url.searchParams.get('since') || 0) || 0;
  const clientId = clean(url.searchParams.get('clientId'), 64);
  const role = url.searchParams.get('role') === 'host' ? 'host' : 'viewer';

  if (clientId) {
    try {
      await kv.put('presence:' + room + ':' + role + ':' + clientId, '1', { expirationTtl: PRESENCE_TTL });
    } catch (e) {}
  }

  const all = await readJson(kv, 'msgs:' + room, []);
  const messages = all.filter(m => m.ts > since).slice(-50);

  let online = 0;
  try {
    const list = await kv.list({ prefix: 'presence:' + room + ':viewer:', limit: 1000 });
    online = list.keys.length;
  } catch (e) {}

  return json(200, { ok: true, messages, online, serverTime: Date.now() });
}

async function handleSend(kv, request) {
  let data;
  try { data = await request.json(); } catch (e) { return json(400, { ok: false, error: 'JSON 格式错误' }); }
  const room = normRoom(data.room);
  const nick = clean(data.nick, MAX_NICK) || '观众';
  const text = clean(data.text, MAX_TEXT);
  if (!text) return json(400, { ok: false, error: '消息不能为空' });

  const msg = {
    id: crypto.randomUUID(),
    room,
    nick,
    text,
    ts: Date.now(),
    clientId: clean(data.clientId, 64)
  };

  const all = await readJson(kv, 'msgs:' + room, []);
  all.push(msg);
  const trimmed = all.slice(-KEEP_MESSAGES);
  await kv.put('msgs:' + room, JSON.stringify(trimmed));

  return json(200, { ok: true, id: msg.id });
}

async function handleProductsGet(kv) {
  const doc = await readJson(kv, 'products', { updatedAt: 0, products: [] });
  return json(200, {
    ok: true,
    updatedAt: doc.updatedAt || 0,
    count: (doc.products || []).length,
    products: doc.products || []
  });
}

async function handleProductsPut(kv, request, env) {
  if (!authed(request, env)) return json(401, { ok: false, error: '管理令牌不正确' });
  let data;
  try { data = await request.json(); } catch (e) { return json(400, { ok: false, error: 'JSON 格式错误' }); }
  const list = Array.isArray(data) ? data : data.products;
  if (!Array.isArray(list)) return json(400, { ok: false, error: 'products 必须是数组' });
  if (list.length > MAX_PRODUCTS) return json(400, { ok: false, error: '商品数量超过 ' + MAX_PRODUCTS });
  const cleaned = list.map(cleanProduct).filter(Boolean);
  if (cleaned.length !== list.length) return json(400, { ok: false, error: '有商品缺少名称或价格不合法' });

  const payload = { updatedAt: Date.now(), products: cleaned };
  await kv.put('products', JSON.stringify(payload));
  return json(200, { ok: true, updatedAt: payload.updatedAt, count: cleaned.length });
}

async function handleLayoutGet(kv) {
  const doc = await readJson(kv, 'layout', { updatedAt: 0, order: [] });
  return json(200, { ok: true, updatedAt: doc.updatedAt || 0, order: doc.order || [] });
}

async function handleLayoutPut(kv, request, env) {
  if (!authed(request, env)) return json(401, { ok: false, error: '管理令牌不正确' });
  let data;
  try { data = await request.json(); } catch (e) { return json(400, { ok: false, error: 'JSON 格式错误' }); }
  const order = cleanOrder(Array.isArray(data) ? data : data.order);
  if (!order) return json(400, { ok: false, error: 'order 必须是数组' });
  if (!order.length) return json(400, { ok: false, error: 'order 不能为空' });

  const payload = { updatedAt: Date.now(), order };
  await kv.put('layout', JSON.stringify(payload));
  return json(200, { ok: true, updatedAt: payload.updatedAt, order });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const kv = env.ZHIBO_KV;
  if (!kv) return json(500, { ok: false, error: '没有绑定 KV：请在 Pages 设置里绑定 ZHIBO_KV' });

  const url = new URL(request.url);
  let path = url.pathname;
  if (path === '/api') path = '/';
  else if (path.indexOf('/api/') === 0) path = path.slice(4);
  path = path.replace(/\/+$/, '') || '/';

  const method = request.method.toUpperCase();
  try {
    if (path === '/health' && method === 'GET') {
      return json(200, { ok: true, runtime: 'cloudflare-pages', kv: !!kv });
    }
    if (path === '/messages' && method === 'GET') return await handleMessages(kv, url);
    if (path === '/send' && method === 'POST') return await handleSend(kv, request);
    if (path === '/products' && method === 'GET') return await handleProductsGet(kv);
    if (path === '/products' && (method === 'PUT' || method === 'POST')) return await handleProductsPut(kv, request, env);
    if (path === '/layout' && method === 'GET') return await handleLayoutGet(kv);
    if (path === '/layout' && (method === 'PUT' || method === 'POST')) return await handleLayoutPut(kv, request, env);
    return json(404, { ok: false, error: 'not found' });
  } catch (e) {
    return json(500, { ok: false, error: (e && e.message) || String(e) });
  }
}
