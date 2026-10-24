import { json, releaseExpired, releaseOrder } from '../_lib/util.js';

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newRef = () => 'DOJ-' + [...crypto.getRandomValues(new Uint8Array(10))].map((b) => REF_CHARS[b % 32]).join('');
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  let input;
  try { input = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  // 1. Validate the customer. Prices are NEVER read from the browser.
  const c = input.customer || {};
  const customer = {
    name: clean(c.name, 100), phone: clean(c.phone, 20), email: clean(c.email, 120),
    address: clean(c.address, 300), city: clean(c.city, 80), fitting_note: clean(c.fitting_note, 500),
  };
  const method = input.delivery_method === 'pickup' ? 'pickup' : 'delivery';
  if (customer.name.length < 2) return json({ error: 'name_required' }, 400);
  if (!/^\+?[0-9\s-]{7,16}$/.test(customer.phone)) return json({ error: 'phone_invalid' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) return json({ error: 'email_invalid' }, 400);
  if (method === 'delivery' && customer.address.length < 5) return json({ error: 'address_required' }, 400);

  // 2. Validate items (merge duplicates, cap quantities).
  const wanted = new Map();
  for (const it of Array.isArray(input.items) ? input.items.slice(0, 10) : []) {
    const id = Number(it.variant_id), qty = Number(it.qty);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1 || qty > 3) return json({ error: 'bad_item' }, 400);
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }
  if (wanted.size === 0) return json({ error: 'empty_cart' }, 400);

  await releaseExpired(db); // free stale holds first

  // 3. Look up real prices and availability.
  const ids = [...wanted.keys()];
  const { results } = await db.prepare(
    `SELECT v.id, v.size, v.stock, v.held, p.name, p.price_kobo, p.active
     FROM variants v JOIN products p ON p.id = v.product_id
     WHERE v.id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all();
  if (results.length !== ids.length) return json({ error: 'item_not_found' }, 400);

  const items = [];
  let subtotal = 0;
  for (const v of results) {
    const qty = wanted.get(v.id);
    if (!v.active) return json({ error: 'item_unavailable', item: `${v.name} (${v.size})` }, 409);
    if (v.stock - v.held < qty) return json({ error: 'sold_out', item: `${v.name} (${v.size})` }, 409);
    items.push({ id: v.id, qty, price: v.price_kobo });
    subtotal += v.price_kobo * qty;
  }
  const fee = method === 'delivery' ? parseInt(env.DELIVERY_FEE_KOBO || '0', 10) || 0 : 0;
  const total = subtotal + fee;
  const holdMin = parseInt(env.HOLD_MINUTES || '15', 10) || 15;
  const reference = newRef();

  // 4. Create the order and reserve stock in ONE transaction. If another buyer took the last
  //    unit a moment ago, the CHECK (held <= stock) fails and everything rolls back.
  try {
    await db.batch([
      db.prepare(`INSERT INTO orders (reference, customer_name, phone, email, delivery_method, address, city,
                  fitting_note, total_kobo, hold_expires_at) VALUES (?,?,?,?,?,?,?,?,?, datetime('now', '+' || ? || ' minutes'))`)
        .bind(reference, customer.name, customer.phone, customer.email, method, customer.address, customer.city,
              customer.fitting_note, total, holdMin),
      ...items.map((i) => db.prepare(
        `INSERT INTO order_items (order_id, variant_id, qty, unit_price_kobo)
         VALUES ((SELECT id FROM orders WHERE reference = ?), ?, ?, ?)`).bind(reference, i.id, i.qty, i.price)),
      ...items.map((i) => db.prepare('UPDATE variants SET held = held + ? WHERE id = ?').bind(i.qty, i.id)),
    ]);
  } catch (e) {
    if (/constraint/i.test(String(e.message))) return json({ error: 'sold_out' }, 409);
    throw e;
  }
  const order = await db.prepare('SELECT id FROM orders WHERE reference = ?').bind(reference).first();

  // 5. Start the Paystack payment (secret key stays on the server).
  const origin = new URL(request.url).origin;
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: customer.email, amount: total, currency: 'NGN', reference,
      callback_url: `${origin}/shop/thank-you/?ref=${reference}`,
      channels: ['card', 'bank_transfer'],
      metadata: { order_reference: reference },
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.status) {
    await releaseOrder(db, order.id, 'failed');
    return json({ error: 'payment_start_failed' }, 502);
  }
  return json({ authorization_url: body.data.authorization_url, reference });
}
