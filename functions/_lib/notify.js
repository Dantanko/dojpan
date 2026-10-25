import { naira } from './page.js';

// Sends the "new paid order" alert. WhatsApp (Meta Cloud API template message) goes to every number in WHATSAPP_TO.
// Email (Resend) is optional. If nothing could be delivered, the claim is released so the admin can show a warning
// and "Resend alerts" can retry. Never throws, so it can never block payment confirmation.
const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 300) || '-'; // template values: no newlines, never empty
const waNumber = (n) => { const d = String(n).replace(/\D/g, ''); return d.startsWith('0') ? '234' + d.slice(1) : d; };
const waReady = (env) => Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID && env.WHATSAPP_TO);
const mailReady = (env) => Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
export const alertsConfigured = (env) => waReady(env) || Boolean(mailReady(env) && env.NOTIFY_EMAIL);

async function sendWhatsApp(env, o, lines) {
  const params = [o.reference, lines.replace(/\n/g, ' | '), `${o.customer_name} ${o.phone}`,
    o.delivery_method === 'pickup' ? 'Collection' : `${o.address} ${o.city}`, o.fitting_note, naira(o.total_kobo)].map((t) => ({ type: 'text', text: oneLine(t) }));
  const errors = []; let ok = false;
  for (const to of env.WHATSAPP_TO.split(',').map((s) => s.trim()).filter(Boolean)) {
    const res = await fetch(`https://graph.facebook.com/${env.WA_API_VERSION || 'v24.0'}/${env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: waNumber(to), type: 'template',
        template: { name: env.WHATSAPP_TEMPLATE || 'new_order_alert', language: { code: env.WHATSAPP_LANG || 'en' }, components: [{ type: 'body', parameters: params }] } }),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
    if (res.ok) ok = true; else errors.push(`${to}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return { ok, errors };
}

async function sendEmails(env, o, lines) {
  const send = (to, subject, text) => fetch('https://api.resend.com/emails', { method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text }) });
  let ok = false;
  if (o.email) { const r = await send(o.email, `Your DOJ Panache order ${o.reference}`,
    `Hello ${o.customer_name},\n\nThank you. We have received your payment for order ${o.reference}:\n\n${lines}\n\nWe will contact you on ${o.phone} to arrange ${o.delivery_method === 'pickup' ? 'collection' : 'delivery'}.\n\nDOJ Panache`); ok = r.ok || ok; }
  if (env.NOTIFY_EMAIL) { const r = await send(env.NOTIFY_EMAIL, `New paid order ${o.reference}`,
    `${lines}\n\nCustomer: ${o.customer_name}, ${o.phone}\n${o.delivery_method}: ${o.address} ${o.city}\nNotes: ${o.fitting_note || '-'}\nTotal: ${naira(o.total_kobo)}\n\nOpen /admin/ to process it.`); ok = r.ok || ok; }
  return ok;
}

export async function notifyPaid(env, orderId) {
  try {
    if (!waReady(env) && !mailReady(env)) return;
    const db = env.DB;
    const claim = await db.prepare(`UPDATE orders SET notified_at = datetime('now') WHERE id = ? AND notified_at IS NULL AND status = 'paid' AND source = 'online'`).bind(orderId).run();
    if (claim.meta.changes !== 1) return; // already sent, or not an online order
    const o = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
    const { results } = await db.prepare(`SELECT oi.qty, p.name, v.size FROM order_items oi JOIN variants v ON v.id = oi.variant_id
      JOIN products p ON p.id = v.product_id WHERE oi.order_id = ?`).bind(orderId).all();
    const lines = results.map((i) => `${i.qty} x ${i.name} (size ${i.size})`).join('\n');
    let ok = false; const errors = [];
    if (waReady(env)) { const r = await sendWhatsApp(env, o, lines); ok = r.ok || ok; errors.push(...r.errors); }
    if (mailReady(env)) ok = (await sendEmails(env, o, lines).catch(() => false)) || ok;
    if (!ok) {
      await db.prepare('UPDATE orders SET notified_at = NULL WHERE id = ?').bind(orderId).run(); // lets "Resend alerts" retry
      await db.prepare('INSERT INTO webhook_log (event, reference, body) VALUES (?,?,?)').bind('alert_failed', o.reference, errors.join(' | ').slice(0, 1000)).run();
    }
  } catch { /* never block payment confirmation */ }
}
