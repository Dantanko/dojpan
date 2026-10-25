import { notifyPaid } from './notify.js';

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const enc = new TextEncoder();

export async function hmacSha512Hex(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// SQL fragments (?1 = order id)
const QTY = `(SELECT qty FROM order_items WHERE order_id = ?1 AND variant_id = variants.id)`;
const ITEMS = `id IN (SELECT variant_id FROM order_items WHERE order_id = ?1)`;

// Release a pending order's hold. Safe to call twice: the second call finds the order
// no longer pending, so both statements do nothing. The batch is one transaction.
export async function releaseOrder(db, orderId, newStatus) {
  await db.batch([
    db.prepare(`UPDATE variants SET held = held - ${QTY} WHERE ${ITEMS}
                AND EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND status = 'pending')`).bind(orderId),
    db.prepare(`UPDATE orders SET status = ?2 WHERE id = ?1 AND status = 'pending'`).bind(orderId, newStatus),
  ]);
}

export async function releaseExpired(db) {
  const { results } = await db
    .prepare(`SELECT id FROM orders WHERE status = 'pending' AND hold_expires_at < datetime('now') LIMIT 25`)
    .all();
  for (const r of results) await releaseOrder(db, r.id, 'expired');
}

// The ONLY place an order becomes paid. Asks Paystack directly, checks amount and currency,
// and is safe to run any number of times (webhook retries, page polling).
export async function settleOrder(env, reference) {
  const db = env.DB;
  const order = await db.prepare('SELECT * FROM orders WHERE reference = ?').bind(reference).first();
  if (!order) return 'not_found';
  if (order.status !== 'pending' && order.status !== 'expired') return order.status;

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.status !== true) throw new Error('paystack_verify_failed');
  const t = body.data;
  if (t.status !== 'success') return order.status;

  if (t.amount !== order.total_kobo || t.currency !== 'NGN') {
    await releaseOrder(db, order.id, 'needs_attention');
    await db.prepare(`UPDATE orders SET status = 'needs_attention' WHERE id = ? AND status = 'expired'`).bind(order.id).run();
    return 'needs_attention';
  }

  const from = order.status; // 'pending' or 'expired' only (never user input)
  const heldPart = from === 'pending' ? `, held = held - ${QTY}` : '';
  try {
    await db.batch([
      db.prepare(`UPDATE variants SET stock = stock - ${QTY}${heldPart} WHERE ${ITEMS}
                  AND EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND status = '${from}')`).bind(order.id),
      db.prepare(`UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ? AND status = ?`).bind(order.id, from),
    ]);
  } catch (e) {
    // Late payment for an expired hold and the stock is gone: a person must decide (refund / next batch).
    if (!/constraint/i.test(String(e.message))) throw e;
    await db.prepare(`UPDATE orders SET status = 'needs_attention' WHERE id = ? AND status = 'expired'`).bind(order.id).run();
    return 'needs_attention';
  }

  const fresh = await db.prepare('SELECT status FROM orders WHERE id = ?').bind(order.id).first();
  if (fresh.status === 'paid') await notifyPaid(env, order.id);
  if (fresh.status === 'paid' || fresh.status === 'needs_attention') return fresh.status;
  throw new Error('settle_retry'); // hold expired mid-way: fail so Paystack retries via the expired path
}
