import { hmacSha512Hex, timingSafeEqual, settleOrder } from '../_lib/util.js';

export async function onRequestPost({ request, env }) {
  const raw = await request.text(); // signature is over the exact raw body
  const sig = request.headers.get('x-paystack-signature') || '';
  const expected = await hmacSha512Hex(env.PAYSTACK_SECRET_KEY, raw);
  if (!timingSafeEqual(sig, expected)) return new Response('invalid signature', { status: 401 });

  let evt = null;
  try { evt = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }
  const reference = evt?.data?.reference || null;
  await env.DB.prepare('INSERT INTO webhook_log (event, reference, body) VALUES (?,?,?)')
    .bind(evt?.event || null, reference, raw.slice(0, 4000)).run();

  if (evt.event !== 'charge.success' || !reference) return new Response('ignored', { status: 200 });
  try {
    await settleOrder(env, reference);
  } catch {
    return new Response('retry', { status: 500 }); // non-200 makes Paystack retry later
  }
  return new Response('ok', { status: 200 });
}
