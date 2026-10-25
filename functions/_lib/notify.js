// Best-effort emails after a payment. Silently does nothing unless RESEND_API_KEY and MAIL_FROM are set.
// The admin page is the source of truth; email is a convenience. Never throws.
export async function notifyPaid(env, orderId) {
  try {
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) return;
    const db = env.DB;
    const claim = await db.prepare(`UPDATE orders SET notified_at = datetime('now') WHERE id = ? AND notified_at IS NULL AND status = 'paid'`).bind(orderId).run();
    if (claim.meta.changes !== 1) return; // someone else already sent it
    const o = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
    const { results } = await db.prepare(`SELECT oi.qty, p.name, v.size FROM order_items oi JOIN variants v ON v.id = oi.variant_id
      JOIN products p ON p.id = v.product_id WHERE oi.order_id = ?`).bind(orderId).all();
    const lines = results.map((i) => `${i.qty} x ${i.name} (size ${i.size})`).join('\n');
    const send = (to, subject, text) => fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text }) });
    await send(o.email, `Your DOJ Panache order ${o.reference}`,
      `Hello ${o.customer_name},\n\nThank you. We have received your payment for order ${o.reference}:\n\n${lines}\n\nWe will contact you on ${o.phone} to arrange ${o.delivery_method === 'pickup' ? 'collection' : 'delivery'}.\n\nDOJ Panache`);
    if (env.NOTIFY_EMAIL) await send(env.NOTIFY_EMAIL, `New paid order ${o.reference}`,
      `${lines}\n\nCustomer: ${o.customer_name}, ${o.phone}\n${o.delivery_method}: ${o.address} ${o.city}\nFitting notes: ${o.fitting_note || '-'}\n\nOpen /admin/ to process it.`);
  } catch { /* never block payment confirmation */ }
}
