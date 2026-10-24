import { json, settleOrder } from '../_lib/util.js';

// The thank-you page polls this. It shows status only and never trusts the browser:
// while an order is pending it asks Paystack directly (same safe function as the webhook).
export async function onRequestGet({ request, env }) {
  const ref = new URL(request.url).searchParams.get('ref') || '';
  if (!/^DOJ-[A-Z0-9]{10}$/.test(ref)) return json({ error: 'bad_ref' }, 400);
  try { await settleOrder(env, ref); } catch { /* fall through and report current status */ }
  const o = await env.DB.prepare('SELECT reference, status, total_kobo, delivery_method FROM orders WHERE reference = ?')
    .bind(ref).first();
  return o ? json(o) : json({ error: 'not_found' }, 404);
}
