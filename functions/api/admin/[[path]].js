import { json } from '../../_lib/util.js';
import { isAdmin, passwordOk, makeCookie, clearCookie, sameOrigin } from '../../_lib/auth.js';

const NEXT = { paid: ['packed', 'refunded'], packed: ['shipped', 'refunded'], shipped: ['delivered'], needs_attention: ['packed', 'refunded'] };
const FILTERS = { open: ['paid', 'packed', 'shipped', 'needs_attention'] };
const ALL = ['paid', 'packed', 'shipped', 'delivered', 'needs_attention', 'refunded', 'cancelled', 'expired', 'failed', 'pending'];

export async function onRequest({ request, env, params }) {
  const path = [].concat(params.path || []).join('/'), m = request.method, db = env.DB;
  if (m === 'POST' && !sameOrigin(request)) return json({ error: 'forbidden' }, 403);

  if (path === 'login' && m === 'POST') {
    const b = await request.json().catch(() => ({}));
    if (!(await passwordOk(env, b.password))) { await new Promise((r) => setTimeout(r, 800)); return json({ error: 'wrong_password' }, 401); }
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', 'set-cookie': await makeCookie(env), 'cache-control': 'no-store' } });
  }
  if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);

  if (path === 'logout' && m === 'POST')
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', 'set-cookie': clearCookie } });

  if (path === 'orders' && m === 'GET') {
    const f = new URL(request.url).searchParams.get('status') || 'open';
    const list = f === 'all' ? ALL : FILTERS[f] || (ALL.includes(f) ? [f] : FILTERS.open);
    const { results: orders } = await db.prepare(`SELECT id, reference, status, customer_name, phone, email, delivery_method, address, city, fitting_note, total_kobo, paid_at, created_at
      FROM orders WHERE status IN (${list.map(() => '?').join(',')}) ORDER BY id DESC LIMIT 100`).bind(...list).all();
    if (orders.length) {
      const { results: items } = await db.prepare(`SELECT oi.order_id, oi.qty, oi.unit_price_kobo, v.size, p.name FROM order_items oi
        JOIN variants v ON v.id = oi.variant_id JOIN products p ON p.id = v.product_id
        WHERE oi.order_id IN (${orders.map(() => '?').join(',')})`).bind(...orders.map((o) => o.id)).all();
      for (const o of orders) o.items = items.filter((i) => i.order_id === o.id);
    }
    return json({ orders });
  }

  if (path === 'order-status' && m === 'POST') {
    const b = await request.json().catch(() => ({}));
    const o = await db.prepare('SELECT id, status FROM orders WHERE reference = ?').bind(String(b.reference || '')).first();
    if (!o) return json({ error: 'not_found' }, 404);
    if (!(NEXT[o.status] || []).includes(b.to)) return json({ error: 'not_allowed', status: o.status }, 409);
    const r = await db.prepare('UPDATE orders SET status = ? WHERE id = ? AND status = ?').bind(b.to, o.id, o.status).run();
    return r.meta.changes === 1 ? json({ ok: true }) : json({ error: 'changed_meanwhile' }, 409);
  }

  if (path === 'stock' && m === 'GET') {
    const { results } = await db.prepare(`SELECT p.id AS pid, p.name, p.active, v.id AS vid, v.size, v.stock, v.held
      FROM products p LEFT JOIN variants v ON v.product_id = p.id ORDER BY p.id DESC, v.id`).all();
    return json({ rows: results });
  }

  if (path === 'stock' && m === 'POST') {
    const b = await request.json().catch(() => ({}));
    if (Number.isInteger(b.variant_id) && Number.isInteger(b.delta) && Math.abs(b.delta) <= 200) {
      try { await db.prepare('UPDATE variants SET stock = stock + ? WHERE id = ?').bind(b.delta, b.variant_id).run(); }
      catch (e) { if (/constraint/i.test(String(e.message))) return json({ error: 'below_reserved' }, 409); throw e; }
      return json({ ok: true });
    }
    if (Number.isInteger(b.product_id) && typeof b.active === 'boolean') {
      await db.prepare('UPDATE products SET active = ? WHERE id = ?').bind(b.active ? 1 : 0, b.product_id).run();
      return json({ ok: true });
    }
    return json({ error: 'bad_request' }, 400);
  }
  return json({ error: 'not_found' }, 404);
}
