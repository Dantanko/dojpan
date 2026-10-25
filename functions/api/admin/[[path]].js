import { json } from '../../_lib/util.js';
import { notifyPaid, alertsConfigured } from '../../_lib/notify.js';
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
    const cols = 'id, reference, status, customer_name, phone, email, delivery_method, address, city, fitting_note, total_kobo, paid_at, created_at, source';
    const { results: orders } = f === 'offline'
      ? await db.prepare(`SELECT ${cols} FROM orders WHERE source <> 'online' ORDER BY id DESC LIMIT 100`).all()
      : await db.prepare(`SELECT ${cols} FROM orders WHERE status IN (${list.map(() => '?').join(',')}) ORDER BY id DESC LIMIT 100`).bind(...list).all();
    const un = await db.prepare(`SELECT COUNT(*) AS c FROM orders WHERE status = 'paid' AND source = 'online' AND notified_at IS NULL AND paid_at < datetime('now', '-2 minutes')`).first();
    if (orders.length) {
      const { results: items } = await db.prepare(`SELECT oi.order_id, oi.qty, oi.unit_price_kobo, v.size, p.name FROM order_items oi
        JOIN variants v ON v.id = oi.variant_id JOIN products p ON p.id = v.product_id
        WHERE oi.order_id IN (${orders.map(() => '?').join(',')})`).bind(...orders.map((o) => o.id)).all();
      for (const o of orders) o.items = items.filter((i) => i.order_id === o.id);
    }
    return json({ orders, alerts_configured: alertsConfigured(env), unalerted: un ? un.c : 0 });
  }

  if (path === 'order-status' && m === 'POST') {
    const b = await request.json().catch(() => ({}));
    const o = await db.prepare('SELECT id, status FROM orders WHERE reference = ?').bind(String(b.reference || '')).first();
    if (!o) return json({ error: 'not_found' }, 404);
    if (!(NEXT[o.status] || []).includes(b.to)) return json({ error: 'not_allowed', status: o.status }, 409);
    const r = await db.prepare('UPDATE orders SET status = ? WHERE id = ? AND status = ?').bind(b.to, o.id, o.status).run();
    return r.meta.changes === 1 ? json({ ok: true }) : json({ error: 'changed_meanwhile' }, 409);
  }

  // Record a sale made outside the website: stock drops, and it is logged as an in-person sale. Nothing else is needed.
  if (path === 'sale' && m === 'POST') {
    const b = await request.json().catch(() => ({}));
    const id = Number(b.variant_id), qty = Number(b.qty);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1 || qty > 20) return json({ error: 'bad_item' }, 400);
    const v = await db.prepare('SELECT v.id, v.size, v.stock, v.held, p.name, p.price_kobo FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?').bind(id).first();
    if (!v) return json({ error: 'item_not_found' }, 404);
    if (v.stock - v.held < qty) return json({ error: 'not_enough', item: `${v.name} (${v.size})` }, 409);
    const ref = 'SALE-' + [...crypto.getRandomValues(new Uint8Array(8))].map((x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
    try {
      await db.batch([
        db.prepare(`INSERT INTO orders (reference, status, customer_name, phone, email, delivery_method, total_kobo, hold_expires_at, paid_at, source)
          VALUES (?, 'delivered', 'In-person sale', '', '', 'pickup', ?, datetime('now'), datetime('now'), 'in_person')`).bind(ref, v.price_kobo * qty),
        db.prepare('INSERT INTO order_items (order_id, variant_id, qty, unit_price_kobo) VALUES ((SELECT id FROM orders WHERE reference = ?), ?, ?, ?)').bind(ref, id, qty, v.price_kobo),
        db.prepare('UPDATE variants SET stock = stock - ? WHERE id = ?').bind(qty, id),
      ]);
    } catch (e) { if (/constraint/i.test(String(e.message))) return json({ error: 'not_enough', item: `${v.name} (${v.size})` }, 409); throw e; }
    return json({ ok: true, reference: ref });
  }

  // Retry alerts for paid online orders whose WhatsApp/email alert did not go out.
  if (path === 'resend-alerts' && m === 'POST') {
    const { results } = await db.prepare(`SELECT id FROM orders WHERE status = 'paid' AND source = 'online' AND notified_at IS NULL ORDER BY id LIMIT 10`).all();
    for (const o of results) await notifyPaid(env, o.id);
    return json({ ok: true, tried: results.length });
  }

  // Undo a wrongly recorded in-person sale: stock goes back. Online orders cannot be undone here (refund via Paystack).
  if (path === 'sale-cancel' && m === 'POST') {
    const b = await request.json().catch(() => ({}));
    const o = await db.prepare('SELECT id, status, source FROM orders WHERE reference = ?').bind(String(b.reference || '')).first();
    if (!o) return json({ error: 'not_found' }, 404);
    if (o.source === 'online' || !['paid', 'packed', 'delivered'].includes(o.status)) return json({ error: 'not_allowed' }, 409);
    const Q = '(SELECT qty FROM order_items WHERE order_id = ?1 AND variant_id = variants.id)';
    const ok = "EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND source <> 'online' AND status IN ('paid','packed','delivered'))";
    await db.batch([
      db.prepare(`UPDATE variants SET stock = stock + ${Q} WHERE id IN (SELECT variant_id FROM order_items WHERE order_id = ?1) AND ${ok}`).bind(o.id),
      db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?1 AND source <> 'online' AND status IN ('paid','packed','delivered')").bind(o.id),
    ]);
    return json({ ok: true });
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
